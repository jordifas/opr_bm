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
    let wizardSelected = false;

    // Load data
    const baseUrl = "https://jordifas.github.io/opr_bm/data/";

    async function loadData() {
        try {
            //const factionsResponse = await fetch(baseUrl + "factions.json");
            //const rulesResponse = await fetch(baseUrl + "rules.json");
            const factionsResponse = await fetch("data/factions.json");
            const rulesResponse = await fetch("data/rules.json");

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
        renderUsedRulesList();
        console.log(currentFaction);

        // Reset selected units when changing faction
        selectedUnitsList = [];
        selectedUnits.innerHTML = '';
        usedPoints = 0;
        selectedHeroes = 0;
        wizardSelected = false;
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

    // Render only the rules used in selected units
    function renderUsedRulesList() {
        rulesList.innerHTML = '';

        // Get all unique special rules used by selected units
        const usedRules = new Map(); // Store rule base name and parameter (if any)

        selectedUnitsList.forEach(unit => {
            if (Array.isArray(unit.special)) {
                unit.special.forEach(rule => {
                    let baseName, param = null;

                    // Extract base rule name and parameter if present
                    const match = rule.match(/^(.+?)\((\d+)\)$/);
                    if (match) {
                        baseName = match[1].trim();
                        param = match[2]; // Store the parameter (e.g., 1 in rule(1))
                    } else {
                        baseName = rule.trim();
                    }

                    // Store the rule along with its parameter
                    usedRules.set(baseName, param);
                });
            }
        });

        // Create elements for each used rule
        usedRules.forEach((param, ruleName) => {
            let ruleDescription = rulesData[ruleName] || rulesData[`${ruleName}(X)`]; // Check normal and parameterized rule

            if (ruleDescription) {
                if (param !== null) {
                    // Replace placeholder 'X' with actual parameter value
                    ruleDescription = ruleDescription.replace(/\bX\b/g, param);
                }

                const ruleElement = document.createElement('div');
                ruleElement.className = 'rule-item';

                ruleElement.innerHTML = `
                    <div class="rule-name">${ruleName}${param !== null ? ` (${param})` : ''}</div>
                    <div class="rule-description">${ruleDescription}</div>
                `;

                rulesList.appendChild(ruleElement);
            }
        });

        // Add spells section if wizard is selected
        if (wizardSelected && factionData[currentFaction].spells) {
            const spellsTitle = document.createElement('h3');
            spellsTitle.textContent = 'Spells';
            spellsTitle.className = 'spells-title';
            rulesList.appendChild(spellsTitle);

            factionData[currentFaction].spells.forEach(spell => {
                const spellElement = document.createElement('div');
                spellElement.className = 'rule-item spell-item';

                spellElement.innerHTML = `
                    <div class="rule-name">${spell.name} (${spell.difficulty})</div>
                    <div class="rule-description">${spell.effect}</div>
                `;

                rulesList.appendChild(spellElement);
            });
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

            // Store if the unit is a wizard
            if (unit.special && Array.isArray(unit.special) &&
                unit.special.some(rule => rule.includes('Wizard'))) {
                unitElement.dataset.wizard = 'true';
            }

            unitElement.querySelector('.unit-name').textContent = unit.name;
            unitElement.querySelector('.unit-cost').textContent = `${unit.cost} pts`;
            unitElement.querySelector('.unit-size').textContent = unit.size;
            unitElement.querySelector('.unit-quality').textContent = unit.quality;
            unitElement.querySelector('.unit-attack').textContent = unit.attack;

            const statsRow = unitElement.querySelector('.stats-row.labels-row');
            const valuesRow = unitElement.querySelector('.stats-row.values-row');

            // Modify hero card to show Leadership instead of armor, tough, equipment
            if (unit.type === 'hero') {
                // Replace armor and tough stats with leadership
                const armorLabel = statsRow.querySelector('.stat-label:nth-child(4)');
                const toughLabel = statsRow.querySelector('.stat-label:nth-child(5)');

                armorLabel.textContent = 'Leadership';
                toughLabel.remove();

                const armorValue = valuesRow.querySelector('.stat-value:nth-child(4)');
                const toughValue = valuesRow.querySelector('.stat-value:nth-child(5)');

                armorValue.textContent = unit.leadership || '0';
                toughValue.remove();

                // Remove equipment row for heroes
                unitElement.querySelector('.equipment-row').style.display = 'none';
            } else {
                // Regular unit stats
                unitElement.querySelector('.unit-armor').textContent = unit.armor;
                unitElement.querySelector('.unit-tough').textContent = unit.tough;
                unitElement.querySelector('.unit-equipment').textContent = unit.equipment || "None";
            }

            // Special rules for all unit types
            unitElement.querySelector('.unit-rules').textContent =
                Array.isArray(unit.special) ? unit.special.join(', ') : "None";

            // Add event listeners for unit selection
            const addButton = unitElement.querySelector('.add-unit-btn');
            const increaseBtn = unitElement.querySelector('.increase-btn');
            const decreaseBtn = unitElement.querySelector('.decrease-btn');
            const quantityElement = unitElement.querySelector('.quantity');

            addButton.addEventListener('click', () => {
                addUnit(unit);
            });

            increaseBtn.addEventListener('click', () => {
                let quantity = parseInt(quantityElement.textContent);
                quantityElement.textContent = quantity + 1;
            });

            decreaseBtn.addEventListener('click', () => {
                let quantity = parseInt(quantityElement.textContent);
                if (quantity > 0) {
                    quantityElement.textContent = quantity - 1;
                }
            });

            availableUnits.appendChild(unitElement);
        });
    }

    // Add a unit to the selected units
    function addUnit(unit) {
        const unitElement = document.querySelector(`[data-name="${unit.name}"]`);
        const quantity = parseInt(unitElement.querySelector('.quantity').textContent);

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

        // Check if wizard was selected
        if (unitElement.dataset.wizard === 'true') {
            wizardSelected = true;
        }

        // Add to selected units list
        selectedUnitsList.push(unitEntry);

        // Render the selected unit
        renderSelectedUnit(unitEntry);

        // Update summary and validate army
        updateSummary();
        validateArmy();
        renderUsedRulesList();

        // Reset quantity in available units
        unitElement.querySelector('.quantity').textContent = '0';
    }

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

        // Check if any wizards are still selected
        wizardSelected = selectedUnitsList.some(unit =>
            unit.special &&
            Array.isArray(unit.special) &&
            unit.special.some(rule => rule.includes('Wizard'))
        );

        // Update UI
        renderSelectedUnits();
        updateSummary();
        validateArmy();
        renderUsedRulesList();
    }

    // Render a selected unit to the list
    function renderSelectedUnit(unit) {
        const unitElement = document.createElement('div');
        unitElement.className = 'unit-card';
        unitElement.dataset.type = unit.type;

        // Create HTML structure similar to the available units
        if (unit.type === 'hero') {
            unitElement.innerHTML = `
                <div class="unit-header">
                    <h3 class="unit-name">${unit.name} x${unit.quantity}</h3>
                    <div class="unit-cost">${unit.totalCost} pts</div>
                </div>
                <div class="unit-stats">
                    <!-- Row 1: Stat Labels -->
                    <div class="stats-row labels-row">
                        <div class="stat-label">Size</div>
                        <div class="stat-label">Quality</div>
                        <div class="stat-label">Attack</div>
                        <div class="stat-label">Leadership</div>
                    </div>
                    <!-- Row 2: Stat Values -->
                    <div class="stats-row values-row">
                        <div class="stat-value">${unit.size}</div>
                        <div class="stat-value">${unit.quality}</div>
                        <div class="stat-value">${unit.attack}</div>
                        <div class="stat-value">${unit.leadership || 'N/A'}</div>
                    </div>
                    <!-- Row 4: Special Rules -->
                    <div class="rules-row">
                        <div class="rules-label">Special Rules:</div>
                        <div class="rules-value">${Array.isArray(unit.special) ? unit.special.join(', ') : 'None'}</div>
                    </div>
                </div>
                <div class="unit-actions">
                    <button class="remove-unit-btn">Remove</button>
                </div>
            `;
        } else {
            unitElement.innerHTML = `
                <div class="unit-header">
                    <h3 class="unit-name">${unit.name} x${unit.quantity}</h3>
                    <div class="unit-cost">${unit.totalCost} pts</div>
                </div>
                <div class="unit-stats">
                    <!-- Row 1: Stat Labels -->
                    <div class="stats-row labels-row">
                        <div class="stat-label">Size</div>
                        <div class="stat-label">Quality</div>
                        <div class="stat-label">Attack</div>
                        <div class="stat-label">Armor</div>
                        <div class="stat-label">Tough</div>
                    </div>
                    <!-- Row 2: Stat Values -->
                    <div class="stats-row values-row">
                        <div class="stat-value">${unit.size}</div>
                        <div class="stat-value">${unit.quality}</div>
                        <div class="stat-value">${unit.attack}</div>
                        <div class="stat-value">${unit.armor}</div>
                        <div class="stat-value">${unit.tough}</div>
                    </div>
                    <!-- Row 3: Equipment -->
                    <div class="equipment-row">
                        <div class="equip-label">Equipment:</div>
                        <div class="equip-value">${unit.equipment || 'None'}</div>
                    </div>
                    <!-- Row 4: Special Rules -->
                    <div class="rules-row">
                        <div class="rules-label">Special Rules:</div>
                        <div class="rules-value">${Array.isArray(unit.special) ? unit.special.join(', ') : 'None'}</div>
                    </div>
                </div>
                <div class="unit-actions">
                    <button class="remove-unit-btn">Remove</button>
                </div>
            `;
        }

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

            // Use the same format as renderSelectedUnit
            if (unit.type === 'hero') {
                unitElement.innerHTML = `
                    <div class="unit-header">
                        <h3 class="unit-name">${unit.name} x${unit.quantity}</h3>
                        <div class="unit-cost">${unit.totalCost} pts</div>
                    </div>
                    <div class="unit-stats">
                        <!-- Row 1: Stat Labels -->
                        <div class="stats-row labels-row">
                            <div class="stat-label">Size</div>
                            <div class="stat-label">Quality</div>
                            <div class="stat-label">Attack</div>
                            <div class="stat-label">Leadership</div>
                        </div>
                        <!-- Row 2: Stat Values -->
                        <div class="stats-row values-row">
                            <div class="stat-value">${unit.size}</div>
                            <div class="stat-value">${unit.quality}</div>
                            <div class="stat-value">${unit.attack}</div>
                            <div class="stat-value">${unit.leadership || 'N/A'}</div>
                        </div>
                        <!-- Row 4: Special Rules -->
                        <div class="rules-row">
                            <div class="rules-label">Special Rules:</div>
                            <div class="rules-value">${Array.isArray(unit.special) ? unit.special.join(', ') : 'None'}</div>
                        </div>
                    </div>
                    <div class="unit-actions">
                        <button class="remove-unit-btn">Remove</button>
                    </div>
                `;
            } else {
                unitElement.innerHTML = `
                    <div class="unit-header">
                        <h3 class="unit-name">${unit.name} x${unit.quantity}</h3>
                        <div class="unit-cost">${unit.totalCost} pts</div>
                    </div>
                    <div class="unit-stats">
                        <!-- Row 1: Stat Labels -->
                        <div class="stats-row labels-row">
                            <div class="stat-label">Size</div>
                            <div class="stat-label">Quality</div>
                            <div class="stat-label">Attack</div>
                            <div class="stat-label">Armor</div>
                            <div class="stat-label">Tough</div>
                        </div>
                        <!-- Row 2: Stat Values -->
                        <div class="stats-row values-row">
                            <div class="stat-value">${unit.size}</div>
                            <div class="stat-value">${unit.quality}</div>
                            <div class="stat-value">${unit.attack}</div>
                            <div class="stat-value">${unit.armor}</div>
                            <div class="stat-value">${unit.tough}</div>
                        </div>
                        <!-- Row 3: Equipment -->
                        <div class="equipment-row">
                            <div class="equip-label">Equipment:</div>
                            <div class="equip-value">${unit.equipment || 'None'}</div>
                        </div>
                        <!-- Row 4: Special Rules -->
                        <div class="rules-row">
                            <div class="rules-label">Special Rules:</div>
                            <div class="rules-value">${Array.isArray(unit.special) ? unit.special.join(', ') : 'None'}</div>
                        </div>
                    </div>
                    <div class="unit-actions">
                        <button class="remove-unit-btn">Remove</button>
                    </div>
                `;
            }

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

    // Export army list as JSON
    function exportArmyList() {
        const exportData = {
            faction: currentFaction,
            totalPoints: armyPoints,
            usedPoints: usedPoints,
            units: selectedUnitsList.map(unit => ({
                name: unit.name,
                quantity: unit.quantity,
                cost: unit.totalCost,
                type: unit.type,
                special: unit.special
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

    // Export army list as string for sharing
    function exportArmyListAsString() {
        const exportData = {
            faction: currentFaction,
            totalPoints: armyPoints,
            usedPoints: usedPoints,
            units: selectedUnitsList.map(unit => ({
                name: unit.name,
                quantity: unit.quantity,
                cost: unit.cost,
                type: unit.type
            }))
        };

        // Convert to compact string format
        const compactString = btoa(JSON.stringify(exportData));

        // Create modal or copy to clipboard
        const textarea = document.createElement('textarea');
        textarea.value = compactString;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        alert('Army list copied to clipboard! Share this code to let others import your army.');
    }

    // Import army list from string
    function importArmyListFromString() {
        const importString = prompt("Paste the army list code here:");
        if (!importString) return;

        try {
            // Decode the string
            const importData = JSON.parse(atob(importString));

            // Set faction
            if (importData.faction) {
                currentFaction = importData.faction;
                factionSelect.value = currentFaction;
                changeFaction();
            }

            // Set points
            if (importData.totalPoints) {
                armyPoints = importData.totalPoints;
                pointsInput.value = armyPoints;
                setArmyPoints();
            }

            // Import units
            if (importData.units && Array.isArray(importData.units)) {
                // Get faction data to match unit details
                const faction = factionData[currentFaction];
                if (!faction || !faction.units) {
                    throw new Error("Faction data not found");
                }

                // Add each unit
                importData.units.forEach(importedUnit => {
                    // Find matching unit in faction
                    const unitData = faction.units.find(u => u.name === importedUnit.name);
                    if (unitData) {
                        // Create unit entry
                        const unitEntry = {
                            ...unitData,
                            quantity: importedUnit.quantity,
                            totalCost: unitData.cost * importedUnit.quantity
                        };

                        // Update counters
                        usedPoints += unitEntry.totalCost;
                        if (unitEntry.type === 'hero') {
                            selectedHeroes += unitEntry.quantity;
                        }

                        // Check if wizard
                        if (unitEntry.special &&
                            Array.isArray(unitEntry.special) &&
                            unitEntry.special.some(rule => rule.includes('Wizard'))) {
                            wizardSelected = true;
                        }

                        // Add to list
                        selectedUnitsList.push(unitEntry);

                        // Render unit
                        renderSelectedUnit(unitEntry);
                    }
                });

                // Update UI
                updateSummary();
                validateArmy();
                renderUsedRulesList();
            }

            alert('Army list imported successfully!');

        } catch (error) {
            console.error("Import error:", error);
            alert('Failed to import army list. The code may be invalid.');
        }
    }

    // Export army list as PDF
    function exportArmyListAsPdf() {
        // Create a new jsPDF instance
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Set initial position
        let y = 20;

        // Add title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        const factionName = factionData[currentFaction].name || currentFaction;
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

        // Function to add a section of units with card design
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
            y += 10;

            // Add each unit as a card
            units.forEach(unit => {
                // Check if we need a new page
                if (y > 230) {
                    doc.addPage();
                    y = 20;
                }

                // Card boundary
                doc.setDrawColor(100, 100, 100);
                doc.setLineWidth(0.5);

                // Card height depends on unit type
                const cardHeight = unit.type === 'hero' ? 55 : 65;

                // Draw rectangle for card
                doc.roundedRect(10, y, 190, cardHeight, 3, 3);

                // Unit header
                doc.setFillColor(240, 240, 240);
                doc.rect(10, y, 190, 10, 'F');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text(`${unit.name} x${unit.quantity}`, 15, y + 7);

                doc.setFont('helvetica', 'normal');
                doc.text(`${unit.totalCost} pts`, 180, y + 7, { align: 'right' });

                y += 12;

                // Stats table - header row
                doc.setLineWidth(0.2);
                doc.line(15, y + 5, 185, y + 5);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');

                if (unit.type === 'hero') {
                    // Hero stats
                    doc.text("Size", 30, y + 4, { align: 'center' });
                    doc.text("Quality", 70, y + 4, { align: 'center' });
                    doc.text("Attack", 110, y + 4, { align: 'center' });
                    doc.text("Leadership", 150, y + 4, { align: 'center' });

                    y += 7;

                    // Values row
                    doc.setFont('helvetica', 'normal');
                    doc.text(unit.size.toString(), 30, y + 4, { align: 'center' });
                    doc.text(unit.quality.toString(), 70, y + 4, { align: 'center' });
                    doc.text(unit.attack.toString(), 110, y + 4, { align: 'center' });
                    doc.text(unit.leadership?.toString() || 'N/A', 150, y + 4, { align: 'center' });
                } else {
                    // Regular unit stats
                    doc.text("Size", 30, y + 4, { align: 'center' });
                    doc.text("Quality", 60, y + 4, { align: 'center' });
                    doc.text("Attack", 90, y + 4, { align: 'center' });
                    doc.text("Armor", 120, y + 4, { align: 'center' });
                    doc.text("Tough", 150, y + 4, { align: 'center' });

                    y += 7;

                    // Values row
                    doc.setFont('helvetica', 'normal');
                    doc.text(unit.size.toString(), 30, y + 4, { align: 'center' });
                    doc.text(unit.quality.toString(), 60, y + 4, { align: 'center' });
                    doc.text(unit.attack.toString(), 90, y + 4, { align: 'center' });
                    doc.text(unit.armor.toString(), 120, y + 4, { align: 'center' });
                    doc.text(unit.tough.toString(), 150, y + 4, { align: 'center' });

                    y += 8;

                    // Equipment
                    doc.setFont('helvetica', 'bold');
                    doc.text("Equipment:", 15, y + 4);
                    doc.setFont('helvetica', 'normal');

                    // Handle long equipment text                    
                    const equipText = unit.equipment || 'None';
                    const maxLineWidth = 160;

                    if (doc.getStringUnitWidth(equipText) * doc.internal.getFontSize() > maxLineWidth) {
                        const splitEquipment = doc.splitTextToSize(equipText, maxLineWidth);
                        doc.text(splitEquipment, 70, y + 4);
                        y += (splitEquipment.length - 1) * 5;
                    } else {
                        doc.text(equipText, 70, y + 4);
                    }
                }

                y += 8;

                // Special rules
                doc.setFont('helvetica', 'bold');
                doc.text("Special Rules:", 15, y + 4);
                doc.setFont('helvetica', 'normal');

                const specialRules = Array.isArray(unit.special) ? unit.special.join(', ') : 'None';
                const splitRules = doc.splitTextToSize(specialRules, 165);
                doc.text(splitRules, 70, y + 4);

                // Add height for multiline rules
                const rulesHeight = Math.max(splitRules.length * 5, 5);

                // Move to next card position
                y += rulesHeight + 15;
            });
        }

        // Add heroes section
        addUnitsSection("Heroes", heroes);

        // Add units section
        addUnitsSection("Units", regularUnits);

        // Add rules section if any units are selected
        if (selectedUnitsList.length > 0) {
            if (y > 200) {
                doc.addPage();
                y = 20;
            }

            // Get all unique special rules used by selected units
            const usedRules = new Set();
            selectedUnitsList.forEach(unit => {
                if (Array.isArray(unit.special)) {
                    unit.special.forEach(rule => {
                        // Extract base rule name without parameters
                        if (rule.includes('(')) {
                            const baseName = rule.substring(0, rule.indexOf('(')).trim();
                            usedRules.add(baseName);
                        } else {
                            usedRules.add(rule);
                        }
                    });
                }
            });

            if (usedRules.size > 0) {
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text("Rules Reference", 14, y);
                y += 10;

                usedRules.forEach(ruleName => {
                    if (rulesData[ruleName]) {
                        // Check if we need a new page
                        if (y > 250) {
                            doc.addPage();
                            y = 20;
                        }

                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.text(ruleName, 15, y);
                        y += 5;

                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'normal');
                        const splitDesc = doc.splitTextToSize(rulesData[ruleName], 180);
                        doc.text(splitDesc, 15, y);

                        y += splitDesc.length * 5 + 5;
                    }
                });
            }

            // Add spells section if wizard is selected
            if (wizardSelected && factionData[currentFaction].spells) {
                if (y > 250) {
                    doc.addPage();
                    y = 20;
                }

                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text("Spells", 14, y);
                y += 10;

                factionData[currentFaction].spells.forEach(spell => {
                    // Check if we need a new page
                    if (y > 250) {
                        doc.addPage();
                        y = 20;
                    }

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${spell.name} (${spell.difficulty})`, 15, y);
                    y += 5;

                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const splitEffect = doc.splitTextToSize(spell.effect, 180);
                    doc.text(splitEffect, 15, y);

                    y += splitEffect.length * 5 + 5;
                });
            }
        }

        // Save the PDF
        doc.save(`${currentFaction}-army-list.pdf`);
    }

    // Add export buttons to the UI
    function addExportButtons() {
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-container';

        const exportButtons = `
            <button id="export-pdf-btn" class="export-btn">Export as PDF</button>
            <button id="export-json-btn" class="export-btn">Export as JSON</button>
            <button id="share-btn" class="export-btn">Share Army List</button>
            <button id="import-btn" class="export-btn">Import Army List</button>
        `;

        exportContainer.innerHTML = exportButtons;

        // Add container after the army-builder section
        const armyBuilder = document.querySelector('.army-builder');
        armyBuilder.parentNode.insertBefore(exportContainer, armyBuilder.nextSibling);

        // Add event listeners
        document.getElementById('export-pdf-btn').addEventListener('click', exportArmyListAsPdf);
        document.getElementById('export-json-btn').addEventListener('click', exportArmyList);
        document.getElementById('share-btn').addEventListener('click', exportArmyListAsString);
        document.getElementById('import-btn').addEventListener('click', importArmyListFromString);
    }

    // Initialize with data
    loadData();

    // Add export buttons after DOM is loaded
    addExportButtons();
});
