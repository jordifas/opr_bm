document.addEventListener('DOMContentLoaded', function () {
    // DOM elements
    const factionSelect = document.getElementById('faction-select');
    const pointsInput = document.getElementById('points-input');
    const setPointsBtn = document.getElementById('set-points-btn');
    const pointsAvailable = document.getElementById('points-available');
    const pointsUsed = document.getElementById('points-used');
    const heroesRequired = document.getElementById('heroes-required');
    const heroesSelected = document.getElementById('heroes-selected');
    const availableUnits = document.getElementById('available-units');
    const selectedUnits = document.getElementById('selected-units');
    const rulesList = document.getElementById('rules-list');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // State
    let armyPoints = 1000;
    let usedPoints = 0;
    let requiredHeroes = Math.floor(armyPoints / 500);
    let selectedHeroes = 0;
    let currentFaction = 'darkElves';
    let factionData = {};
    let rulesData = {};
    let selectedUnitsList = [];

    // Load data
const baseUrl = "https://jordifas.github.io/opr_bm/data/";

async function loadData() {
    try {
        const factionsResponse = await fetch(baseUrl + "factions.json");
        const rulesResponse = await fetch(baseUrl + "rules.json");

        console.log(factionsResponse.ok);
        console.log(rulesResponse.ok);

        if (!factionsResponse.ok || !rulesResponse.ok) {
            throw new Error("Failed to fetch JSON files.");
        }

        factionData = await factionsResponse.json();
        rulesData = await rulesResponse.json();

        initializeApp();
    } catch (error) {
        console.error("Error loading data:", error);
        
        initializeApp();
    }
}


    // Initialize the application
    function initializeApp() {
        renderRulesList();
        renderUnitsList();
        updateSummary();

        // Event listeners
        setPointsBtn.addEventListener('click', setArmyPoints);
        factionSelect.addEventListener('change', changeFaction);

        filterButtons.forEach(button => {
            button.addEventListener('click', filterUnits);
        });
    }

    // Update the summary information
    function updateSummary() {
        pointsAvailable.textContent = armyPoints;
        pointsUsed.textContent = usedPoints;
        heroesRequired.textContent = requiredHeroes;
        heroesSelected.textContent = selectedHeroes;
    }

    // Set the army points
    function setArmyPoints() {
        const points = parseInt(pointsInput.value);
        if (points < 500) {
            alert('Army points must be at least 500');
            return;
        }

        armyPoints = points;
        requiredHeroes = Math.floor(armyPoints / 500);

        updateSummary();
        validateArmy();
    }

    // Change the selected faction
    function changeFaction() {
        currentFaction = factionSelect.value;
        renderUnitsList();
        console.log(currentFaction);

        // Reset selected units when changing faction
        selectedUnitsList = [];
        selectedUnits.innerHTML = '';
        usedPoints = 0;
        selectedHeroes = 0;
        updateSummary();
    }

    // Filter units by type
    function filterUnits(e) {
        const filter = e.target.dataset.filter;

        // Update active button
        filterButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Filter units
        const unitCards = availableUnits.querySelectorAll('.unit-card');
        unitCards.forEach(card => {
            const unitType = card.dataset.type;
            if (filter === 'all' || filter === unitType) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Render the rules list
    function renderRulesList() {
        rulesList.innerHTML = '';

        for (const [ruleName, ruleDescription] of Object.entries(rulesData)) {
            const ruleElement = document.createElement('div');
            ruleElement.className = 'rule-item';

            ruleElement.innerHTML = `
                <div class="rule-name">${ruleName}</div>
                <div class="rule-description">${ruleDescription}</div>
            `;

            rulesList.appendChild(ruleElement);
        }
    }

    // Render the units list
    function renderUnitsList() {
        availableUnits.innerHTML = '';
    
        const faction = factionData[currentFaction];
        if (!faction || !faction.units) {
            console.error(`Faction data for '${currentFaction}' not found.`);
            return;
        }
    
        const template = document.getElementById('unit-card-template');
    
        faction.units.forEach(unit => {
            const unitCard = document.importNode(template.content, true);
            const unitElement = unitCard.querySelector('.unit-card');
    
            unitElement.dataset.type = unit.type;
            unitElement.dataset.name = unit.name;
            unitElement.dataset.cost = unit.cost;
    
            unitElement.querySelector('.unit-name').textContent = unit.name;
            unitElement.querySelector('.unit-cost').textContent = `${unit.cost} pts`;
            unitElement.querySelector('.unit-size').textContent = unit.size;
            unitElement.querySelector('.unit-quality').textContent = unit.quality;
            unitElement.querySelector('.unit-attack').textContent = unit.attack;
            unitElement.querySelector('.unit-armor').textContent = unit.armor;
            unitElement.querySelector('.unit-tough').textContent = unit.tough;
            unitElement.querySelector('.unit-equipment').textContent = unit.equipment;
    
            // ✅ Fix: Ensure 'special' exists before calling 'join'
            unitElement.querySelector('.unit-rules').textContent = Array.isArray(unit.special) ? unit.special.join(', ') : "None";
    
            availableUnits.appendChild(unitElement);
        });
    }


    // Add a unit to the selected units
    function addUnit(unit) {
        const quantity = parseInt(document.querySelector(`[data-name="${unit.name}"] .quantity`).textContent);
        if (quantity <= 0) {
            alert('Please select a quantity greater than 0.');
            return;
        }

        const totalCost = unit.cost * quantity;

        // Check if there are enough points
        if (usedPoints + totalCost > armyPoints) {
            alert('Not enough points available!');
            return;
        }

        // Create a new unit entry for the selected list
        const unitEntry = {
            ...unit,
            quantity: quantity,
            totalCost: totalCost
        };

        // Update points and heroes count
        usedPoints += totalCost;
        if (unit.type === 'hero') {
            selectedHeroes += quantity;
        }

        // Add to selected units list
        selectedUnitsList.push(unitEntry);

        // Render the selected unit
        renderSelectedUnit(unitEntry);

        // Update summary and validate army
        updateSummary();
        validateArmy();

        // Reset quantity in available units
        document.querySelector(`[data-name="${unit.name}"] .quantity`).textContent = '0';
    }

    // Remove a unit from the selected units
    // Remove a unit from the selected units
    function removeUnit(index) {
        const unit = selectedUnitsList[index];

        // Update points and heroes count
        usedPoints -= unit.totalCost;
        if (unit.type === 'hero') {
            selectedHeroes -= unit.quantity;
        }

        // Remove from list
        selectedUnitsList.splice(index, 1);

        // Update UI
        renderSelectedUnits();
        updateSummary();
        validateArmy();
    }

    // Render a selected unit to the list
    function renderSelectedUnit(unit) {
        const unitElement = document.createElement('div');
        unitElement.className = 'unit-card';
        unitElement.dataset.type = unit.type;

        unitElement.innerHTML = `
        <div class="unit-header">
            <h3 class="unit-name">${unit.name} x${unit.quantity}</h3>
            <div class="unit-cost">${unit.totalCost} pts</div>
        </div>
        <div class="unit-stats">
            <div class="stat"><span class="stat-label">Size:</span> <span>${unit.size}</span></div>
            <div class="stat"><span class="stat-label">Quality:</span> <span>${unit.quality}</span></div>
            <div class="stat"><span class="stat-label">Attack:</span> <span>${unit.attack}</span></div>
            <div class="stat"><span class="stat-label">Armor:</span> <span>${unit.armor}</span></div>
            <div class="stat"><span class="stat-label">Tough:</span> <span>${unit.tough}</span></div>
            <div class="stat"><span class="stat-label">Equipment:</span> <span>${unit.equipment}</span></div>
            <div class="stat"><span class="stat-label">Special Rules:</span> <span>${unit.special.join(', ')}</span></div>
        </div>
        <div class="unit-actions">
            <button class="remove-unit-btn">Remove</button>
        </div>
    `;

        const removeBtn = unitElement.querySelector('.remove-unit-btn');
        const index = selectedUnitsList.length - 1;
        removeBtn.addEventListener('click', () => removeUnit(index));

        selectedUnits.appendChild(unitElement);
    }

    // Render all selected units
    function renderSelectedUnits() {
        selectedUnits.innerHTML = '';

        selectedUnitsList.forEach((unit, index) => {
            const unitElement = document.createElement('div');
            unitElement.className = 'unit-card';
            unitElement.dataset.type = unit.type;

            unitElement.innerHTML = `
            <div class="unit-header">
                <h3 class="unit-name">${unit.name} x${unit.quantity}</h3>
                <div class="unit-cost">${unit.totalCost} pts</div>
            </div>
            <div class="unit-stats">
                <div class="stat"><span class="stat-label">Size:</span> <span>${unit.size}</span></div>
                <div class="stat"><span class="stat-label">Quality:</span> <span>${unit.quality}</span></div>
                <div class="stat"><span class="stat-label">Attack:</span> <span>${unit.attack}</span></div>
                <div class="stat"><span class="stat-label">Armor:</span> <span>${unit.armor}</span></div>
                <div class="stat"><span class="stat-label">Tough:</span> <span>${unit.tough}</span></div>
                <div class="stat"><span class="stat-label">Equipment:</span> <span>${unit.equipment}</span></div>
                <div class="stat"><span class="stat-label">Special Rules:</span> <span>${unit.special.join(', ')}</span></div>
            </div>
            <div class="unit-actions">
                <button class="remove-unit-btn">Remove</button>
            </div>
        `;

            const removeBtn = unitElement.querySelector('.remove-unit-btn');
            removeBtn.addEventListener('click', () => removeUnit(index));

            selectedUnits.appendChild(unitElement);
        });
    }

    // Validate the army composition
    function validateArmy() {
        const pointsElement = document.getElementById('points-available');
        const heroesElement = document.getElementById('heroes-required');

        // Check points
        if (usedPoints > armyPoints) {
            pointsElement.classList.add('error');
        } else {
            pointsElement.classList.remove('error');
        }

        // Check heroes
        if (selectedHeroes < requiredHeroes) {
            heroesElement.classList.add('error');
        } else {
            heroesElement.classList.remove('error');
        }
    }

    // Export army list
    function exportArmyList() {
        const exportData = {
            faction: currentFaction,
            totalPoints: armyPoints,
            usedPoints: usedPoints,
            units: selectedUnitsList.map(unit => ({
                name: unit.name,
                quantity: unit.quantity,
                cost: unit.totalCost,
                type: unit.type
            }))
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `${currentFaction}-army-list.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    function exportArmyListAsPdf() {
        // Create a new jsPDF instance
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Set initial position
        let y = 20;

        // Add title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        const factionName = factionData[currentFaction].name;
        doc.text(`${factionName} Army List (${usedPoints}/${armyPoints} pts)`, 105, y, { align: 'center' });
        y += 15;

        // Add date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const today = new Date().toLocaleDateString();
        doc.text(`Generated on: ${today}`, 105, y, { align: 'center' });
        y += 15;

        // Group units by type
        const heroes = selectedUnitsList.filter(unit => unit.type === 'hero');
        const regularUnits = selectedUnitsList.filter(unit => unit.type === 'unit');

        // Function to add a section of units
        function addUnitsSection(title, units) {
            if (units.length === 0) return;

            // Check if need new page
            if (y > 250) {
                doc.addPage();
                y = 20;
            }

            // Add section header
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, y);
            y += 8;

            // Add table header
            doc.setFontSize(10);
            doc.setDrawColor(0);
            doc.setFillColor(240, 240, 240);
            doc.rect(10, y, 190, 7, 'F');
            doc.text("Unit", 14, y + 5);
            doc.text("Qty", 70, y + 5);
            doc.text("Cost", 85, y + 5);
            doc.text("Stats", 105, y + 5);
            doc.text("Special Rules", 150, y + 5);
            y += 10;

            // Add units
            units.forEach(unit => {
                // Check if we need a new page
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }

                const unitHeight = 7;
                doc.setFont('helvetica', 'bold');
                doc.text(unit.name, 14, y + 5);
                doc.setFont('helvetica', 'normal');
                doc.text(unit.quantity.toString(), 70, y + 5);
                doc.text(`${unit.totalCost} pts`, 85, y + 5);

                // Stats
                const stats = `Size: ${unit.size}, Qual: ${unit.quality}, Atk: ${unit.attack}, Arm: ${unit.armor}, Tough: ${unit.tough}`;
                doc.text(stats, 105, y + 5);

                // Special rules (handle longer text)
                const specialRules = unit.special.join(', ');
                if (specialRules.length > 40) {
                    const firstLine = specialRules.substring(0, 40) + "...";
                    doc.text(firstLine, 150, y + 5);
                } else {
                    doc.text(specialRules, 150, y + 5);
                }

                // Draw lines
                doc.setDrawColor(200, 200, 200);
                doc.line(10, y + unitHeight, 200, y + unitHeight);

                y += unitHeight + 3;

                // Add equipment on next line if available
                if (unit.equipment && unit.equipment.length > 0) {
                    doc.text(`Equipment: ${unit.equipment}`, 20, y + 3);
                    y += 8;
                }
            });

            y += 10; // Add some space after the section
        }

        // Add heroes and units sections
        addUnitsSection("HEROES", heroes);
        addUnitsSection("UNITS", regularUnits);

        // Add rules summary if fits
        if (y < 240 && selectedUnitsList.length > 0) {
            // Get all unique special rules used by selected units
            const usedRules = new Set();
            selectedUnitsList.forEach(unit => {
                unit.special.forEach(rule => {
                    if (rule.includes('(')) {
                        // Extract base rule name without parameters
                        const baseName = rule.substring(0, rule.indexOf('('));
                        usedRules.add(baseName);
                    } else {
                        usedRules.add(rule);
                    }
                });
            });

            // Add rules section if there are rules to display
            if (usedRules.size > 0) {
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text("SPECIAL RULES REFERENCE", 14, y);
                y += 8;

                // Add each rule
                doc.setFontSize(9);
                usedRules.forEach(rule => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }

                    if (rulesData[rule]) {
                        doc.setFont('helvetica', 'bold');
                        doc.text(rule, 14, y);
                        doc.setFont('helvetica', 'normal');

                        // Handle long rule descriptions
                        const description = rulesData[rule];
                        const maxWidth = 180;
                        const lines = doc.splitTextToSize(description, maxWidth);
                        doc.text(lines, 14, y + 4);

                        y += 4 + (lines.length * 4) + 2;
                    }
                });
            }
        }

        // Save the PDF
        doc.save(`${currentFaction}-army-list.pdf`);
    }

    // Add export PDF button
    function addExportPdfButton() {
        const exportPdfBtn = document.createElement('button');
        exportPdfBtn.textContent = 'Export as PDF';
        exportPdfBtn.id = 'export-pdf-btn';
        exportPdfBtn.addEventListener('click', exportArmyListAsPdf);

        const container = document.querySelector('.selected-container');

        // Add after export JSON button
        const exportJsonBtn = document.getElementById('export-btn');
        if (exportJsonBtn) {
            container.insertBefore(exportPdfBtn, exportJsonBtn.nextSibling);
        } else {
            container.insertBefore(exportPdfBtn, container.firstChild.nextSibling);
        }
    }

    // Add export button
    function addExportButton() {
        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export Army List';
        exportBtn.id = 'export-btn';
        exportBtn.addEventListener('click', exportArmyList);

        const container = document.querySelector('.selected-container');
        container.insertBefore(exportBtn, container.firstChild.nextSibling);
    }

    // Add CSS for validation
    function addValidationStyles() {
        const style = document.createElement('style');
        style.textContent = `
        .error {
            color: #e63946;
            font-weight: bold;
        }
    `;
        document.head.appendChild(style);
    }

    // Initialize extra features
    function initExtraFeatures() {
        addExportButton();
        addExportPdfButton();
        addValidationStyles();
    }

    // Start the application
    loadData();
    initExtraFeatures();


});

// First, add the jsPDF library to your index.html
// Add this line in the <head> section of index.html
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

// Now let's modify your scripts.js file to add PDF export functionality
// Add this function after the exportArmyList function



// Modify initExtraFeatures to add PDF export button
