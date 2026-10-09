document.addEventListener('DOMContentLoaded', function() {
    // -----------------------------------------------------
    // 1. AI Size Finder Unit Switching & Dynamic Validation
    // -----------------------------------------------------
    const unitPreferenceInput = document.getElementById('unit_preference');
    const metricBtn = document.getElementById('btn-metric');
    const imperialBtn = document.getElementById('btn-imperial');

    if (metricBtn && imperialBtn && unitPreferenceInput) {
        const heightInput = document.getElementById('height');
        const weightInput = document.getElementById('weight');
        const chestInput = document.getElementById('chest');
        const waistInput = document.getElementById('waist');

        const heightUnit = document.getElementById('height-unit');
        const weightUnit = document.getElementById('weight-unit');
        const chestUnit = document.getElementById('chest-unit');
        const waistUnit = document.getElementById('waist-unit');

        const heightHelp = document.getElementById('height-help');
        const weightHelp = document.getElementById('weight-help');

        function setUnitSystem(system) {
            unitPreferenceInput.value = system;
            if (system === 'metric') {
                metricBtn.classList.add('active');
                imperialBtn.classList.remove('active');

                // Label updates
                if (heightUnit) heightUnit.textContent = 'cm';
                if (weightUnit) weightUnit.textContent = 'kg';
                if (chestUnit) chestUnit.textContent = 'cm';
                if (waistUnit) waistUnit.textContent = 'cm';

                // Input validations
                if (heightInput) { heightInput.min = 100; heightInput.placeholder = 'e.g. 175.5'; }
                if (weightInput) { weightInput.min = 20; weightInput.placeholder = 'e.g. 70.2'; }
                if (chestInput) { chestInput.min = 20; chestInput.placeholder = 'e.g. 96.5'; }
                if (waistInput) { waistInput.min = 20; waistInput.placeholder = 'e.g. 84.0'; }

                // Help text
                if (heightHelp) heightHelp.textContent = 'Minimum 100 cm. Enter your height standing flat against a wall.';
                if (weightHelp) weightHelp.textContent = 'Minimum 20 kg. Enter your body weight in kilograms.';
            } else {
                metricBtn.classList.remove('active');
                imperialBtn.classList.add('active');

                // Label updates
                if (heightUnit) heightUnit.textContent = 'inches';
                if (weightUnit) weightUnit.textContent = 'lbs';
                if (chestUnit) chestUnit.textContent = 'inches';
                if (waistUnit) waistUnit.textContent = 'inches';

                // Input validations
                if (heightInput) { heightInput.min = 40; heightInput.placeholder = 'e.g. 69.1'; }
                if (weightInput) { weightInput.min = 20; weightInput.placeholder = 'e.g. 154.5'; }
                if (chestInput) { chestInput.min = 20; chestInput.placeholder = 'e.g. 38.0'; }
                if (waistInput) { waistInput.min = 20; waistInput.placeholder = 'e.g. 33.1'; }

                // Help text
                if (heightHelp) heightHelp.textContent = 'Minimum 40 inches. Enter your height in inches.';
                if (weightHelp) weightHelp.textContent = 'Minimum 20 lbs. Enter your body weight in pounds.';
            }
        }

        metricBtn.addEventListener('click', () => setUnitSystem('metric'));
        imperialBtn.addEventListener('click', () => setUnitSystem('imperial'));

        // Set initial state based on current hidden input value
        setUnitSystem(unitPreferenceInput.value || 'metric');
    }

    // -----------------------------------------------------
    // 2. Admin Dashboard Charts using Chart.js
    // -----------------------------------------------------
    const salesChartCtx = document.getElementById('salesChart');
    const categoryChartCtx = document.getElementById('categoryChart');

    if (salesChartCtx) {
        // Sales and Orders Chart
        const labels = JSON.parse(salesChartCtx.getAttribute('data-labels') || '[]');
        const salesData = JSON.parse(salesChartCtx.getAttribute('data-sales') || '[]');
        const ordersData = JSON.parse(salesChartCtx.getAttribute('data-orders') || '[]');

        new Chart(salesChartCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Sales (₹)',
                        data: salesData,
                        borderColor: '#bfa37a',
                        backgroundColor: 'rgba(191, 163, 122, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Orders',
                        data: ordersData,
                        borderColor: '#111111',
                        backgroundColor: 'rgba(17, 17, 17, 0.05)',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Sales Amount (₹)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Order Count' }
                    }
                }
            }
        });
    }

    if (categoryChartCtx) {
        // Category Split Chart
        const labels = JSON.parse(categoryChartCtx.getAttribute('data-labels') || '[]');
        const counts = JSON.parse(categoryChartCtx.getAttribute('data-counts') || '[]');

        new Chart(categoryChartCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        '#111111',
                        '#bfa37a',
                        '#4f5d75',
                        '#8d99ae',
                        '#d90429',
                        '#ef233c',
                        '#2b2d42',
                        '#a3c1ad'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // -----------------------------------------------------
    // 3. Size Selection in Cart / Products Page
    // -----------------------------------------------------
    const sizeSelectors = document.querySelectorAll('.size-select-btn');
    const selectedSizeInput = document.getElementById('selected-size');

    sizeSelectors.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            sizeSelectors.forEach(b => b.classList.remove('active', 'btn-dark'));
            sizeSelectors.forEach(b => b.classList.add('btn-outline-dark'));

            this.classList.remove('btn-outline-dark');
            this.classList.add('active', 'btn-dark');

            if (selectedSizeInput) {
                selectedSizeInput.value = this.getAttribute('data-size');
            }
        });
    });
});
