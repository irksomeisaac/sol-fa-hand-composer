// Reliable MediaPipe loader for GitHub Pages deployment
export const loadMediaPipe = async () => {
    // Try multiple CDN sources for reliability
    const cdnSources = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915',
        'https://unpkg.com/@mediapipe/hands@0.4.1646424915',
        'https://cdn.skypack.dev/@mediapipe/hands@0.4.1646424915'
    ];

    for (const baseUrl of cdnSources) {
        try {
            // Test if the CDN is accessible by checking for hands.js
            const testResponse = await fetch(`${baseUrl}/hands.js`);
            if (testResponse.ok) {
                console.log('Using MediaPipe from:', baseUrl);
                return (file) => `${baseUrl}/${file}`;
            }
        } catch (error) {
            console.warn(`Failed to load from ${baseUrl}:`, error);
        }
    }

    // Fallback to local files if CDNs fail
    console.warn('All CDNs failed, using local fallback');
    return (file) => `/mediapipe/${file}`;
};

// Preload critical MediaPipe files
export const preloadMediaPipeAssets = async () => {
    try {
        const locateFile = await loadMediaPipe();
        
        // Preload critical files
        const criticalFiles = [
            'hands.js',
            'hands_solution_packed_assets.data',
            'hands_solution_simd_wasm_bin.wasm'
        ];

        const preloadPromises = criticalFiles.map(file => {
            return new Promise((resolve) => {
                const url = locateFile(file);
                const link = document.createElement('link');
                link.rel = 'preload';
                link.href = url;
                link.as = file.endsWith('.wasm') ? 'fetch' : 'script';
                link.crossOrigin = 'anonymous';
                link.onload = () => resolve(true);
                link.onerror = () => resolve(false);
                document.head.appendChild(link);
            });
        });

        await Promise.all(preloadPromises);
        return locateFile;
    } catch (error) {
        console.error('Failed to preload MediaPipe assets:', error);
        return null;
    }
};
