Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false }
    },
    scales: {
        y: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { font: { size: 10 } }
        },
        x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
        }
    },
    elements: {
        line: { tension: 0.4 },
        point: { radius: 0 }
    }
};

const protocolChart = new Chart(document.getElementById('protocolChart'), {
    type: 'doughnut',
    data: {
        labels: ['TCP', 'UDP', 'HTTP', 'DNS', 'Other'],
        datasets: [{
            data: [0, 0, 0, 0, 0],
            backgroundColor: ['#00f2ff', '#b100ff', '#00ff88', '#ffee00', '#ff4757'],
            borderWidth: 0,
            hoverOffset: 10
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '80%',
        plugins: {
            legend: {
                display: true,
                position: 'right',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 11 }
                }
            }
        }
    }
});

const bandwidthChart = new Chart(document.getElementById('bandwidthChart'), {
    type: 'line',
    data: {
        labels: Array(20).fill(''),
        datasets: [{
            label: 'Bandwidth',
            data: Array(20).fill(0),
            borderColor: '#00f2ff',
            backgroundColor: 'rgba(0, 242, 255, 0.1)',
            fill: true,
            borderWidth: 2
        }]
    },
    options: commonOptions
});

const latencyChart = new Chart(document.getElementById('latencyChart'), {
    type: 'line',
    data: {
        labels: Array(20).fill(''),
        datasets: [{
            label: 'Latency',
            data: Array(20).fill(0),
            borderColor: '#b100ff',
            backgroundColor: 'rgba(177, 0, 255, 0.1)',
            fill: true,
            borderWidth: 2
        }]
    },
    options: commonOptions
});

function updateCharts(stats) {
    if (!stats) return;

    // 1. Update Protocol Distribution
    const protocols = stats.protocols || {};
    const labels = protocolChart.data.labels;
    const newData = labels.map(label => protocols[label] || 0);
    protocolChart.data.datasets[0].data = newData;
    protocolChart.update('none');

    // 2. Update Bandwidth Time-Series
    const bwData = bandwidthChart.data.datasets[0].data;
    bwData.push(stats.bandwidth || 0);
    if (bwData.length > 20) bwData.shift();
    bandwidthChart.update('none');

    // 3. Update Latency Time-Series
    const latData = latencyChart.data.datasets[0].data;
    // Simulator or Real stats might not have latency yet, using 0 as fallback
    latData.push(stats.latency || 0);
    if (latData.length > 20) latData.shift();
    latencyChart.update('none');

    // Update Mini-Stats in UI
    const bwStat = document.getElementById('bandwidthStat');
    if (bwStat) bwStat.innerText = stats.bandwidth + ' B/s';

    // For Latency, we might need to calculate it or get it from backend
    const latStat = document.getElementById('latencyStat');
    if (latStat) latStat.innerText = (stats.latency || 0) + ' ms';
}
