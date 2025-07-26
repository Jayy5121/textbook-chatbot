const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001'
    ],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());

// Enhanced request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Body:`, 
                req.method === 'POST' ? JSON.stringify(req.body).substring(0, 100) : 'N/A');
    next();
});

// Cache for Python command that works
let workingPythonCommand = null;

/**
 * Find and validate the Python script path
 */
function findScriptPath() {
    const possiblePaths = [
        path.join(__dirname, 'embeddings', 'search_faiss.py'),
        path.join(__dirname, 'search_faiss.py')
    ];

    for (const scriptPath of possiblePaths) {
        if (fs.existsSync(scriptPath)) {
            console.log(`[INFO] Found script at: ${scriptPath}`);
            return scriptPath;
        }
    }

    console.error(`[ERROR] Script not found in any of these locations:`, possiblePaths);
    return null;
}

/**
 * Validate FAISS files exist
 */
function validateFaissFiles(scriptDir) {
    const requiredFiles = [
        'intro_ml_index.faiss',
        'intro_ml_metadata.pkl'
    ];

    const missingFiles = [];
    
    for (const file of requiredFiles) {
        const filePath = path.join(scriptDir, file);
        if (!fs.existsSync(filePath)) {
            missingFiles.push(file);
        }
    }

    if (missingFiles.length > 0) {
        console.error(`[ERROR] Missing FAISS files:`, missingFiles);
        return { valid: false, missingFiles };
    }

    console.log(`[INFO] All FAISS files found in: ${scriptDir}`);
    return { valid: true, missingFiles: [] };
}

/**
 * Test Python command and cache the working one
 */
async function findWorkingPythonCommand() {
    if (workingPythonCommand) {
        return workingPythonCommand;
    }

    const pythonCommands = ['python', 'python3', 'py'];
    
    for (const command of pythonCommands) {
        try {
            const result = await new Promise((resolve) => {
                const process = spawn(command, ['--version'], { timeout: 3000 });
                
                process.on('close', (code) => {
                    resolve(code === 0);
                });
                
                process.on('error', () => {
                    resolve(false);
                });
            });

            if (result) {
                workingPythonCommand = command;
                console.log(`[INFO] Using Python command: ${command}`);
                return command;
            }
        } catch (error) {
            continue;
        }
    }

    console.error(`[ERROR] No working Python command found from:`, pythonCommands);
    return null;
}

/**
 * Clean JSON output by removing non-JSON lines
 */
function extractJsonFromOutput(output) {
    if (!output || output.trim() === '') {
        return null;
    }

    // Try to parse the entire output as JSON first
    try {
        return JSON.parse(output.trim());
    } catch (e) {
        // If that fails, try to find JSON in the output
        const lines = output.split('\n');
        
        // Look for lines that start with { or [
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    return JSON.parse(trimmed);
                } catch (parseError) {
                    continue;
                }
            }
        }

        // Try to find the largest JSON-like block
        let jsonStart = -1;
        let braceCount = 0;
        
        for (let i = 0; i < output.length; i++) {
            if (output[i] === '{') {
                if (jsonStart === -1) jsonStart = i;
                braceCount++;
            } else if (output[i] === '}') {
                braceCount--;
                if (braceCount === 0 && jsonStart !== -1) {
                    try {
                        const jsonStr = output.substring(jsonStart, i + 1);
                        return JSON.parse(jsonStr);
                    } catch (parseError) {
                        jsonStart = -1;
                    }
                }
            }
        }

        return null;
    }
}

/**
 * POST /search - Enhanced semantic search with better JSON handling
 */
app.post('/search', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { query, top_k } = req.body;

        // Input validation
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Query is required and must be a non-empty string',
                example: { query: "What is machine learning?" }
            });
        }

        const topK = top_k && Number.isInteger(top_k) && top_k > 0 ? top_k : 5;
        console.log(`[${new Date().toISOString()}] Search: "${query.substring(0, 50)}..." (top_k: ${topK})`);

        // Find script path
        const scriptPath = findScriptPath();
        if (!scriptPath) {
            return res.status(500).json({
                error: 'Configuration Error',
                message: 'Search script not found. Please ensure search_faiss.py exists.',
                suggestions: [
                    'Check if search_faiss.py exists in the project root or embeddings/ folder',
                    'Verify the file has proper permissions'
                ]
            });
        }

        // Validate FAISS files
        const scriptDir = path.dirname(scriptPath);
        const faissValidation = validateFaissFiles(scriptDir);
        if (!faissValidation.valid) {
            return res.status(500).json({
                error: 'Missing Dependencies',
                message: 'Required FAISS index files not found',
                missing_files: faissValidation.missingFiles,
                script_directory: scriptDir,
                suggestions: [
                    'Run the embedding generation script first',
                    'Ensure all FAISS files are in the correct directory'
                ]
            });
        }

        // Find working Python command
        const pythonCommand = await findWorkingPythonCommand();
        if (!pythonCommand) {
            return res.status(500).json({
                error: 'Python Not Available',
                message: 'No working Python installation found',
                tried_commands: ['python', 'python3', 'py'],
                suggestions: [
                    'Install Python and ensure it\'s in your PATH',
                    'Try running "python --version" in terminal'
                ]
            });
        }

        // Prepare command arguments - CRITICAL: Use --json flag
        const args = [
            scriptPath,
            '--query', query.trim(),
            '--top_k', topK.toString(),
            '--json'  // This ensures JSON-only output
        ];

        console.log(`[DEBUG] Executing: ${pythonCommand} ${args.join(' ')}`);
        console.log(`[DEBUG] Working directory: ${scriptDir}`);

        // Execute Python script with enhanced error handling
        const result = await new Promise((resolve, reject) => {
            let isResolved = false;
            
            const pythonProcess = spawn(pythonCommand, args, {
                cwd: scriptDir,
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1',
                    PYTHONIOENCODING: 'utf-8'
                },
                timeout: 45000
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (isResolved) return;
                isResolved = true;

                const duration = Date.now() - startTime;
                console.log(`[DEBUG] Process completed in ${duration}ms with code ${code}`);
                console.log(`[DEBUG] STDOUT length: ${stdout.length} chars`);
                console.log(`[DEBUG] STDERR length: ${stderr.length} chars`);

                if (stderr.trim()) {
                    console.log(`[DEBUG] STDERR content: ${stderr.trim()}`);
                }

                if (code === 0) {
                    resolve({ success: true, output: stdout, stderr: stderr, duration });
                } else {
                    reject({ 
                        success: false, 
                        code, 
                        stderr: stderr.trim(), 
                        stdout: stdout.trim(),
                        duration 
                    });
                }
            });

            pythonProcess.on('error', (error) => {
                if (isResolved) return;
                isResolved = true;
                reject({ success: false, error: error.message, duration: Date.now() - startTime });
            });

            // Timeout handler
            setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    pythonProcess.kill('SIGTERM');
                    reject({ 
                        success: false, 
                        error: 'timeout', 
                        duration: Date.now() - startTime,
                        message: 'Search operation timed out after 45 seconds'
                    });
                }
            }, 45000);
        });

        // Success response - Enhanced JSON parsing
        console.log(`[${new Date().toISOString()}] Search completed successfully in ${result.duration}ms`);
        
        // Extract and parse JSON from the output
        const jsonResult = extractJsonFromOutput(result.output);
        
        if (jsonResult) {
            console.log(`[DEBUG] Successfully parsed JSON with ${jsonResult.total_results || 0} results`);
            res.status(200).json(jsonResult);
        } else {
            console.log(`[WARNING] Could not parse JSON from output. Raw output:`, result.output.substring(0, 200));
            
            // Fallback: create a properly formatted response
            const fallbackResponse = {
                error: "JSON Parse Error",
                message: "The search script did not return valid JSON",
                raw_output: result.output.substring(0, 500),
                suggestions: [
                    "The Python script may not be using the updated version with proper JSON mode",
                    "Check if the --json flag is being handled correctly in the Python script"
                ]
            };
            
            res.status(500).json(fallbackResponse);
        }

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${new Date().toISOString()}] Search failed after ${duration}ms:`, error);

        // Handle different types of errors
        if (error.error === 'timeout') {
            return res.status(504).json({
                error: 'Request Timeout',
                message: error.message || 'Search operation timed out',
                duration: `${duration}ms`,
                suggestions: [
                    'The model might be loading for the first time (this can take several minutes)',
                    'Try a simpler query',
                    'Check if the FAISS index is corrupted and needs regeneration'
                ]
            });
        }

        if (error.stderr) {
            // Try to parse stderr as JSON first
            const stderrJson = extractJsonFromOutput(error.stderr);
            if (stderrJson && stderrJson.error) {
                return res.status(500).json(stderrJson);
            }

            return res.status(500).json({
                error: 'Python Script Error',
                message: 'The search script encountered an error',
                details: error.stderr,
                stdout: error.stdout ? error.stdout.substring(0, 200) : null,
                duration: `${duration}ms`,
                suggestions: [
                    'Check if all required Python packages are installed',
                    'Verify the FAISS index files are not corrupted',
                    'Run: pip install faiss-cpu sentence-transformers'
                ]
            });
        }

        // Generic error response
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message || 'An unexpected error occurred during search',
            duration: `${duration}ms`
        });
    }
});

/**
 * GET /search/test - Test endpoint with JSON validation
 */
app.get('/search/test', async (req, res) => {
    // Test if the search functionality works with a simple query
    try {
        const testQuery = "machine learning";
        const scriptPath = findScriptPath();
        const pythonCommand = await findWorkingPythonCommand();
        
        if (!scriptPath || !pythonCommand) {
            return res.status(503).json({
                status: 'unhealthy',
                message: 'Server components not available',
                timestamp: new Date().toISOString(),
                issues: {
                    script_found: !!scriptPath,
                    python_available: !!pythonCommand
                }
            });
        }

        // Quick test of the search script
        const testProcess = spawn(pythonCommand, [
            scriptPath,
            '--query', testQuery,
            '--top_k', '1',
            '--json'
        ], {
            cwd: path.dirname(scriptPath),
            timeout: 10000
        });

        let testOutput = '';
        testProcess.stdout.on('data', (data) => {
            testOutput += data.toString();
        });

        const testResult = await new Promise((resolve) => {
            testProcess.on('close', (code) => {
                const jsonResult = extractJsonFromOutput(testOutput);
                resolve({
                    exit_code: code,
                    json_valid: !!jsonResult,
                    has_results: jsonResult && jsonResult.results && jsonResult.results.length > 0
                });
            });

            testProcess.on('error', () => {
                resolve({ exit_code: -1, json_valid: false, has_results: false });
            });

            setTimeout(() => {
                testProcess.kill('SIGTERM');
                resolve({ exit_code: -1, json_valid: false, has_results: false, timeout: true });
            }, 10000);
        });

        res.status(200).json({
            status: testResult.json_valid && testResult.exit_code === 0 ? 'healthy' : 'unhealthy',
            message: 'Server status check completed',
            timestamp: new Date().toISOString(),
            server_info: {
                node_version: process.version,
                platform: process.platform,
                uptime: Math.floor(process.uptime()),
                working_python_command: pythonCommand,
                script_path: scriptPath
            },
            test_results: testResult
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server test failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /search/validate - Comprehensive validation endpoint
 */
app.get('/search/validate', async (req, res) => {
    const validation = {
        timestamp: new Date().toISOString(),
        script_found: false,
        script_path: null,
        faiss_files: { valid: false, missing: [] },
        python_available: false,
        python_command: null,
        overall_status: 'unhealthy'
    };

    try {
        // Check script
        validation.script_path = findScriptPath();
        validation.script_found = !!validation.script_path;

        if (validation.script_found) {
            // Check FAISS files
            const scriptDir = path.dirname(validation.script_path);
            const faissCheck = validateFaissFiles(scriptDir);
            validation.faiss_files = faissCheck;

            // Check Python
            validation.python_command = await findWorkingPythonCommand();
            validation.python_available = !!validation.python_command;

            // Overall status
            if (validation.script_found && validation.faiss_files.valid && validation.python_available) {
                validation.overall_status = 'healthy';
            }
        }

        const statusCode = validation.overall_status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(validation);

    } catch (error) {
        validation.error = error.message;
        res.status(500).json(validation);
    }
});

// Keep your existing debug endpoint unchanged
app.get('/search/debug', async (req, res) => {
    try {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            node_version: process.version,
            working_directory: __dirname,
            files_in_directory: [],
            python_check: null,
            script_locations: {},
            faiss_files: {}
        };

        // Check files in current directory
        try {
            debugInfo.files_in_directory = fs.readdirSync(__dirname);
        } catch (e) {
            debugInfo.files_in_directory = `Error reading directory: ${e.message}`;
        }

        // Check script locations
        const possiblePaths = [
            path.join(__dirname, 'search_faiss.py'),
            path.join(__dirname, 'embeddings', 'search_faiss.py')
        ];

        possiblePaths.forEach(scriptPath => {
            debugInfo.script_locations[scriptPath] = {
                exists: fs.existsSync(scriptPath),
                path: scriptPath
            };
        });

        // Check FAISS files
        const faissFiles = ['intro_ml_index.faiss', 'intro_ml_metadata.pkl', 'intro_ml_metadata.json'];
        [__dirname, path.join(__dirname, 'embeddings')].forEach(dir => {
            faissFiles.forEach(file => {
                const filePath = path.join(dir, file);
                const key = `${dir}/${file}`;
                debugInfo.faiss_files[key] = {
                    exists: fs.existsSync(filePath),
                    path: filePath
                };
                if (fs.existsSync(filePath)) {
                    try {
                        const stats = fs.statSync(filePath);
                        debugInfo.faiss_files[key].size = stats.size;
                        debugInfo.faiss_files[key].modified = stats.mtime;
                    } catch (e) {
                        debugInfo.faiss_files[key].error = e.message;
                    }
                }
            });
        });

        // Test Python commands
        const pythonCommands = ['python', 'python3', 'py'];
        const pythonResults = {};

        const checkPythonCommand = (command) => {
            return new Promise((resolve) => {
                const pythonProcess = spawn(command, ['--version'], { cwd: __dirname });
                let output = '', error = '';

                pythonProcess.stdout.on('data', (data) => output += data.toString());
                pythonProcess.stderr.on('data', (data) => error += data.toString());

                pythonProcess.on('close', (code) => {
                    pythonResults[command] = {
                        exit_code: code,
                        version: output.trim() || error.trim(),
                        success: code === 0
                    };
                    resolve();
                });

                pythonProcess.on('error', (err) => {
                    pythonResults[command] = { error: err.message, success: false };
                    resolve();
                });

                setTimeout(() => {
                    pythonProcess.kill('SIGTERM');
                    pythonResults[command] = { error: 'Timeout', success: false };
                    resolve();
                });
            });
        };

        await Promise.all(pythonCommands.map(checkPythonCommand));
        debugInfo.python_check = pythonResults;
        debugInfo.cached_python_command = workingPythonCommand;

        res.status(200).json(debugInfo);

    } catch (error) {
        res.status(500).json({
            error: 'Debug check failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
    });
});

// Add this route to your existing server.js file

/**
 * POST /search/answer - Generate LLM answer from search results
 */
app.post('/search/answer', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { query } = req.body;

        // Input validation
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Query is required and must be a non-empty string',
                example: { query: "What is machine learning?" }
            });
        }

        console.log(`[${new Date().toISOString()}] LLM Answer request: "${query.substring(0, 50)}..."`);

        // First, get search results using existing search logic
        const searchStartTime = Date.now();
        
        // Find script path and validate
        const scriptPath = findScriptPath();
        if (!scriptPath) {
            return res.status(500).json({
                error: 'Configuration Error',
                message: 'Search script not found'
            });
        }

        const pythonCommand = await findWorkingPythonCommand();
        if (!pythonCommand) {
            return res.status(500).json({
                error: 'Python Not Available',
                message: 'No working Python installation found'
            });
        }

        // Execute FAISS search first
        const searchArgs = [
            scriptPath,
            '--query', query.trim(),
            '--top_k', '5',
            '--json'
        ];

        const searchResult = await new Promise((resolve, reject) => {
            let isResolved = false;
            
            const pythonProcess = spawn(pythonCommand, searchArgs, {
                cwd: path.dirname(scriptPath),
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1',
                    PYTHONIOENCODING: 'utf-8'
                },
                timeout: 30000
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (isResolved) return;
                isResolved = true;

                if (code === 0) {
                    resolve({ success: true, output: stdout, stderr });
                } else {
                    reject({ success: false, code, stderr: stderr.trim(), stdout: stdout.trim() });
                }
            });

            pythonProcess.on('error', (error) => {
                if (isResolved) return;
                isResolved = true;
                reject({ success: false, error: error.message });
            });

            setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    pythonProcess.kill('SIGTERM');
                    reject({ success: false, error: 'Search timeout' });
                }
            }, 30000);
        });

        // Parse search results
        const searchJsonResult = extractJsonFromOutput(searchResult.output);
        
        if (!searchJsonResult || !searchJsonResult.results || searchJsonResult.results.length === 0) {
            return res.status(404).json({
                error: 'No Results Found',
                message: 'No relevant content found for your query to generate an answer',
                query: query.trim()
            });
        }

        const searchResults = searchJsonResult.results;
        const searchDuration = Date.now() - searchStartTime;
        
        console.log(`[DEBUG] Found ${searchResults.length} chunks for LLM processing`);

        // Now call the LLM script with the chunks
        const llmStartTime = Date.now();
        const llmScriptPath = path.join(__dirname,'embeddings', 'llm_answer.py');
        
        // Check if LLM script exists
        if (!fs.existsSync(llmScriptPath)) {
            return res.status(500).json({
                error: 'LLM Script Not Found',
                message: 'The llm_answer.py script was not found',
                expected_path: llmScriptPath
            });
        }

        // Prepare arguments for LLM script: query + all chunk contents
        const llmArgs = [llmScriptPath, query.trim()];
        
        // Add each chunk content as a separate argument
        searchResults.forEach(chunk => {
            llmArgs.push(chunk.content || '');
        });

        console.log(`[DEBUG] Calling LLM script with ${searchResults.length} chunks`);

        const llmResult = await new Promise((resolve, reject) => {
            let isResolved = false;
            
            const llmProcess = spawn(pythonCommand, llmArgs, {
                cwd: __dirname,
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1',
                    PYTHONIOENCODING: 'utf-8'
                },
                timeout: 120000 // 2 minutes for LLM processing
            });

            let stdout = '';
            let stderr = '';

            llmProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            llmProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            llmProcess.on('close', (code) => {
                if (isResolved) return;
                isResolved = true;

                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout.trim());
                        resolve(result);
                    } catch (parseError) {
                        reject({
                            error: 'LLM Parse Error',
                            message: 'Failed to parse LLM response',
                            details: parseError.message,
                            raw_output: stdout.substring(0, 500)
                        });
                    }
                } else {
                    reject({
                        error: 'LLM Processing Failed',
                        message: `LLM script failed with exit code ${code}`,
                        stderr: stderr.trim(),
                        stdout: stdout.trim()
                    });
                }
            });

            llmProcess.on('error', (error) => {
                if (isResolved) return;
                isResolved = true;
                reject({
                    error: 'LLM Process Error',
                    message: 'Failed to start LLM process',
                    details: error.message
                });
            });

            setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    llmProcess.kill('SIGTERM');
                    reject({
                        error: 'LLM Timeout',
                        message: 'LLM processing timed out after 2 minutes'
                    });
                }
            }, 120000);
        });

        const llmDuration = Date.now() - llmStartTime;
        const totalDuration = Date.now() - startTime;

        console.log(`[DEBUG] LLM processing completed in ${llmDuration}ms`);

        // Build response
        const response = {
            query: query.trim(),
            answer: llmResult.answer || llmResult.response || 'No answer generated',
            api_used: llmResult.api_used || 'Unknown',
            model_used: llmResult.model_used || null,
            chunks_processed: searchResults.length,
            search_results: searchResults.map((chunk, index) => ({
                rank: index + 1,
                chunk_id: chunk.chunk_id || `chunk_${index + 1}`,
                score: chunk.score || null,
                preview: chunk.content ? chunk.content.substring(0, 150) + '...' : 'No content',
                word_count: chunk.content ? chunk.content.split(' ').length : 0
            })),
            timing: {
                search_duration: searchDuration,
                llm_duration: llmDuration,
                total_duration: totalDuration
            },
            metadata: {
                timestamp: new Date().toISOString(),
                chunks_found: searchResults.length,
                total_processing_time: `${totalDuration}ms`
            }
        };

        console.log(`[${new Date().toISOString()}] LLM Answer completed in ${totalDuration}ms`);
        res.status(200).json(response);

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${new Date().toISOString()}] LLM Answer failed after ${duration}ms:`, error);

        let statusCode = 500;
        let errorMessage = 'Failed to generate LLM answer';

        // Handle specific error types
        if (error.error === 'Search timeout' || error.message?.includes('timeout')) {
            statusCode = 408;
            errorMessage = 'Request timed out. The search or LLM processing took too long.';
        } else if (error.message?.includes('LLM')) {
            statusCode = 503;
            errorMessage = 'LLM service is currently unavailable. Please try again later.';
        } else if (error.stderr && error.stderr.includes('ImportError')) {
            statusCode = 500;
            errorMessage = 'Required Python dependencies are missing. Please check your LLM script setup.';
        }

        res.status(statusCode).json({
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? {
                message: error.message || error.error,
                stderr: error.stderr,
                stdout: error.stdout
            } : undefined,
            query: req.body.query,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            suggestions: [
                'Check if llm_answer.py script exists and is executable',
                'Verify your LLM API keys are properly configured',
                'Ensure all required Python packages are installed',
                'Try with a simpler query'
            ]
        });
    }
});



// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Textbook Chatbot API server running on port ${PORT}`);
    console.log(`📍 Search endpoint: POST http://localhost:${PORT}/search`);
    console.log(`🧪 Test endpoint: GET http://localhost:${PORT}/search/test`);
    console.log(`🔍 Validation: GET http://localhost:${PORT}/search/validate`);
    console.log(`🔧 Debug endpoint: GET http://localhost:${PORT}/search/debug`);
    console.log(`🌐 CORS enabled for localhost:3000 and localhost:3001`);
    
    // Run initial validation
    setTimeout(async () => {
        console.log('\n🔍 Running initial system validation...');
        try {
            const scriptPath = findScriptPath();
            if (scriptPath) {
                const pythonCommand = await findWorkingPythonCommand();
                console.log(`✅ System appears ready (Script: ${scriptPath}, Python: ${pythonCommand})`);
            } else {
                console.log('❌ System validation failed - check /search/validate endpoint');
            }
        } catch (error) {
            console.log('❌ System validation error:', error.message);
        }
    }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;