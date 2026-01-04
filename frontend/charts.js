const ctxProtocol = document.getElementById('protocolChart').getContext('2d');
const ctxSource = document.getElementById('sourceChart').getContext('2d');
const ctxDomain = document.getElementById('domainChart').getContext('2d');

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: { color: '#e0e0e0' }
        }
    },
    scales: {
        y: {
            grid: { color: '#404040' },
            ticks: { color: '#e0e0e0' }
        },
        x: {
            grid: { color: '#404040' },
            ticks: { color: '#e0e0e0' }
        }
    }
};

const protocolChart = new Chart(ctxProtocol, {
    type: 'doughnut',
    data: {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: [
                '#64B5F6', '#81C784', '#FFD54F', '#BA68C8', '#E57373', '#90A4AE'
            ],
            borderWidth: 0
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { color: '#e0e0e0' } }
        }
    }
});

const sourceChart = new Chart(ctxSource, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Packets',
            data: [],
            backgroundColor: '#4CAF50'
        }]
    },
    options: commonOptions
});

const domainChart = new Chart(ctxDomain, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Requests',
            data: [],
            backgroundColor: '#FF7043'
        }]
    },
    options: {
        ...commonOptions,
        indexAxis: 'y' // Horizontal bar chart for domains (names can be long)
    }
});

function updateCharts(stats) {
    if (!stats) return;

    // Update Protocol Chart
    const protocols = stats.protocols || {};
    protocolChart.data.labels = Object.keys(protocols);
    protocolChart.data.datasets[0].data = Object.values(protocols);
    protocolChart.update('none'); // 'none' for performance

    // Update Top Sources Chart
    const sources = stats.topSources || {};
    sourceChart.data.labels = Object.keys(sources);
    sourceChart.data.datasets[0].data = Object.values(sources);
    sourceChart.update('none');

    // Update Top Domains Chart
    const domains = stats.topDomains || {};
    domainChart.data.labels = Object.keys(domains);
    domainChart.data.datasets[0].data = Object.values(domains);
    domainChart.update('none');
}
