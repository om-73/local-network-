const CONFIG = {
    // Update this URL after deploying your backend to Render
    BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' 
        : 'https://your-backend-service-name.onrender.com' 
};
