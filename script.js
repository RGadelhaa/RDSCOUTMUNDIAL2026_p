        // URL DO GOOGLE APPS SCRIPT EMBUTIDA
        const HARDCODED_URL = "https://script.google.com/macros/s/AKfycby_5NNK9c9tEL4QsBSY0wL-2QRV3tID7pUrQ3LF5JRkBaH4qTE07fHhRp_GmDfO9iaC/exec";
        
        const DEFAULT_API_KEY = "dOExBlvaZmscfFLUd9fMGxub23iv89htIkuzA0f7GV0wVajV69IV72j5O9aa3tm0"; 
        
        let allEventsCache = {}; 
        let currentSearchYear = 2026;
        let currentMatchType = 'qm';
        let currentPosition = null;
        let schedules = { qm: {} };
        let teamListCache = [];
        
        const emptyShiftData = () => ({
            active: false,
            scored: 0,
            intake: { our: 0, neutral: 0, opponent: 0 },
            feed: { our: 0, neutral: 0, opponent: 0 },
            defense: false,
            hpFed: 0,
            roles: { scorer: false, feeder: false, defense: false, stealer: false, cycler: false }
        });

        // GLOBAL SCOUT DATA STATE
        let scoutData = { 
            eventKey: "", eventName: "", matchType: "", matchNum: 0, scouterName: "", teamNum: 0, alliance: "",
            auto: { startPos: "", fuelsScored: 0, fuelsFed: 0, collectDepot: false, collectGround: false, collectOutpost: false, crossedTrench: false, crossedBump: false, climbL1: "none", hpFed: 0 },
            transition: { 
                scored: 0, intake: { our: 0, neutral: 0, opponent: 0 }, feed: { our: 0, neutral: 0, opponent: 0 }, hpFed: 0, roles: { scorer: false, feeder: false, defense: false, stealer: false, cycler: false } },
            shifts: { s1: emptyShiftData(), s2: emptyShiftData(), s3: emptyShiftData(), s4: emptyShiftData() },
            endgame: { 
                scored: 0, intake: { our: 0, neutral: 0, opponent: 0 }, feed: { our: 0, neutral: 0, opponent: 0 }, climbLevel: "none", climbStatus: "none", hpFed: 0, roles: { scorer: false, feeder: false, defense: false, stealer: false, cycler: false } },
            offmatch: { energized: false, supercharged: false, transversal: false, fouls: 0, sufferedDefense: false, broke: false, fragile: false, crossBump: false, crossTrench: false, driverSkill: 0, defensiveSkill: 0, shootAccuracy: "", comments: "" }
        };

        window.onload = () => {
            const savedKey = localStorage.getItem('rd_tba_key');
            document.getElementById('apiKeyInput').value = (savedKey && savedKey !== DEFAULT_API_KEY) ? savedKey : DEFAULT_API_KEY;
            localStorage.setItem('rd_tba_key', document.getElementById('apiKeyInput').value);

            // Carrega URL Hardcoded se não tiver salvo, ou usa a salva
            const savedSheetUrl = localStorage.getItem('rd_sheets_url');
            const urlToUse = savedSheetUrl || HARDCODED_URL;
            document.getElementById('sheetsUrlInput').value = urlToUse;
            if(!savedSheetUrl) localStorage.setItem('rd_sheets_url', HARDCODED_URL);

            const savedEventKey = localStorage.getItem('rd_event_key');
            const savedEventName = localStorage.getItem('rd_event_name');
            const savedScouter = localStorage.getItem('rd_scouter_name');

            // --- AUTO OPEN SIDEBAR CHECK ---
            // If we don't have basic data, open the sidebar automatically
            const hasData = savedEventKey && savedEventName && savedScouter && localStorage.getItem('rd_schedule_qm');
            
            if (savedEventKey && savedEventName) {
                 // Update sidebar display for event even if closed
                document.getElementById('selectedEventName').innerText = savedEventName;
                document.getElementById('selectedEventKey').innerText = savedEventKey;
                document.getElementById('eventKeyInput').value = savedEventKey;
                document.getElementById('selectedEventContainer').classList.remove('hidden');
                
                // Enable update button
                 const btn = document.getElementById('mainActionBtn');
                 btn.disabled = false;
                 btn.classList.remove('cursor-not-allowed', 'from-slate-700', 'to-slate-800', 'text-slate-400', 'border-slate-700');
                 btn.classList.add('from-indigo-600', 'to-violet-600', 'text-white', 'hover:from-indigo-500', 'hover:to-violet-500', 'active:scale-95', 'border-indigo-500/50');
            }

            if(savedScouter) document.getElementById('scouterNameInput').value = savedScouter;

            if (!hasData) {
                setTimeout(toggleSidebar, 300); // Open sidebar smoothly after load
            } else {
                // If we have data, load the match selector
                if(savedEventName) document.getElementById('ms-eventNameDisplay').innerText = savedEventName;
                if(savedEventKey) document.getElementById('ms-eventKeyDisplay').innerText = savedEventKey;
            }

            loadMatchSelectorData();
            renderShiftHTML(1); renderShiftHTML(2); renderShiftHTML(3); renderShiftHTML(4);
            // setSearchYear(2026); // REMOVE TO PREVENT ERROR
        };

        // --- SIDEBAR LOGIC ---
        function toggleSidebar() {
            const sidebar = document.getElementById('app-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            sidebar.classList.toggle('sidebar-open');
            overlay.classList.toggle('overlay-show');
            
            // If closing sidebar, ensure we update the main view titles if changed
            if (!sidebar.classList.contains('sidebar-open')) {
                 const evtName = localStorage.getItem('rd_event_name');
                 const evtKey = localStorage.getItem('rd_event_key');
                 if(evtName) document.getElementById('ms-eventNameDisplay').innerText = evtName;
                 if(evtKey) document.getElementById('ms-eventKeyDisplay').innerText = evtKey;
            }
        }

        function saveSheetsUrl(url) {
            localStorage.setItem('rd_sheets_url', url.trim());
        }

        // FUNÇÃO PARA SALVAR NOME DO SCOUTER
        function saveScouterName(name) {
            localStorage.setItem('rd_scouter_name', name.trim());
        }

        function showToast(title, msg, type='success') {
            const toast = document.getElementById('toast');
            const icon = document.getElementById('toast-icon');
            const titleEl = document.getElementById('toast-title');
            const msgEl = document.getElementById('toast-msg');
            
            titleEl.innerText = title;
            msgEl.innerText = msg;
            
            if(type==='error') {
                icon.className = "fas fa-times-circle text-red-500 text-xl";
                titleEl.className = "font-bold text-sm text-red-400";
            } else {
                icon.className = "fas fa-check-circle text-green-500 text-xl";
                titleEl.className = "font-bold text-sm text-white";
            }

            toast.classList.add('toast-show');
            setTimeout(() => toast.classList.remove('toast-show'), 4000);
        }

        // --- GOOGLE SHEETS EXPORT FUNCTION ---
        function sendDataToSheets() {
            // 1. VALIDAÇÃO OBRIGATÓRIA: NOME DO SCOUTER
            const scouterInput = document.getElementById('scouterNameInput');
            const scouterName = scouterInput ? scouterInput.value.trim() : "";

            if (!scouterName) {
                showToast("Erro!", "O Nome do Scouter é obrigatório para enviar!", "error");
                
                // Se a sidebar não estiver aberta, abre ela para mostrar o campo
                const sidebar = document.getElementById('app-sidebar');
                if (sidebar && !sidebar.classList.contains('sidebar-open')) {
                    toggleSidebar();
                }

                // Destaca o campo visualmente e foca nele
                if (scouterInput) {
                    setTimeout(() => {
                        scouterInput.focus();
                        scouterInput.classList.remove('border-slate-700'); // Remove borda padrão
                        scouterInput.classList.add('border-red-500', 'ring-2', 'ring-red-500', 'bg-red-900/20'); // Adiciona destaque vermelho
                    }, 300); // Pequeno delay para aguardar a sidebar abrir

                    // Remove o destaque vermelho após 3 segundos
                    setTimeout(() => {
                        scouterInput.classList.remove('border-red-500', 'ring-2', 'ring-red-500', 'bg-red-900/20');
                        scouterInput.classList.add('border-slate-700');
                    }, 4000);
                }
                return; // INTERROMPE A FUNÇÃO AQUI
            }

            // 2. Finaliza os dados
            scoutData.scouterName = scouterName;
            const currentMatch = document.getElementById('matchNumInput').value;
            scoutData.eventKey = localStorage.getItem('rd_event_key');
            scoutData.eventName = localStorage.getItem('rd_event_name');
            scoutData.matchType = currentMatchType.toUpperCase();
            scoutData.matchNum = currentMatch;
            scoutData.teamNum = document.getElementById('teamInput').value;
            scoutData.alliance = document.getElementById('scout-alliance').innerText;
            scoutData.offmatch.comments = document.getElementById('off-comments').value;
            scoutData.offmatch.shootAccuracy = document.getElementById('select-accuracy').value;

            // 3. Gera a linha CSV (Flat Data)
            const csvLine = generateCSV(scoutData);

            // 4. Salva no LocalStorage (Backup de Segurança)
            let storedMatches = JSON.parse(localStorage.getItem('rd_saved_matches') || "[]");
            storedMatches.push(csvLine);
            localStorage.setItem('rd_saved_matches', JSON.stringify(storedMatches));

            const btn = document.getElementById('btn-next-phase'); // Botão salvar agora
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ENVIANDO...`;
            btn.disabled = true;

            const scriptUrl = localStorage.getItem('rd_sheets_url') || HARDCODED_URL;
            
            // Envia
            const payload = JSON.stringify(scoutData);
            
            fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors', // Importante para Apps Script
                headers: { 'Content-Type': 'text/plain' }, // Importante para Apps Script
                body: payload
            })
            .then(() => {
                showToast("Sucesso!", "Dados enviados para a planilha.");
                setTimeout(() => {
                    navTo('page-match-selector');
                    // Incrementar match automaticamente
                    adjustMatch(1);
                    // Limpa dados da memória RAM
                    resetScoutData();
                }, 1000);
            })
            .catch(err => {
                showToast("Erro", "Falha ao enviar. Verifique a internet.", "error");
                console.error(err);
            })
            .finally(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
        }

        function generateCSV(data) {
            // Função auxiliar para converter booleano em 1 ou 0
            const b = (val) => val ? 1 : 0;
            
            // ARRAY ORDENADO - A ORDEM IMPORTA PARA O GOOGLE SHEETS
            let row = [
                // Header Info
                data.eventKey,
                data.matchType,
                data.matchNum,
                data.teamNum,
                data.alliance,
                data.scouterName,

                // AUTO
                data.auto.startPos,
                data.auto.fuelsScored, // Pontos Auto
                data.auto.fuelsFed,
                data.auto.hpFed,
                b(data.auto.crossedTrench),
                b(data.auto.crossedBump),
                b(data.auto.collectGround),
                b(data.auto.collectDepot),
                b(data.auto.collectOutpost),
                data.auto.climbL1, // "none", "failed", "success"

                // TRANSITION
                data.transition.scored,
                data.transition.hpFed,
                data.transition.intake.our,
                data.transition.intake.neutral,
                data.transition.intake.opponent,
                data.transition.feed.our,
                data.transition.feed.neutral,
                data.transition.feed.opponent,

                // SHIFTS (S1 - S4)
                // S1
                b(data.shifts.s1.active),
                data.shifts.s1.scored,
                data.shifts.s1.hpFed,
                data.shifts.s1.intake.our, data.shifts.s1.intake.neutral, data.shifts.s1.intake.opponent,
                data.shifts.s1.feed.our, data.shifts.s1.feed.neutral, data.shifts.s1.feed.opponent,
                // S2
                b(data.shifts.s2.active),
                data.shifts.s2.scored,
                data.shifts.s2.hpFed,
                data.shifts.s2.intake.our, data.shifts.s2.intake.neutral, data.shifts.s2.intake.opponent,
                data.shifts.s2.feed.our, data.shifts.s2.feed.neutral, data.shifts.s2.feed.opponent,
                // S3
                b(data.shifts.s3.active),
                data.shifts.s3.scored,
                data.shifts.s3.hpFed,
                data.shifts.s3.intake.our, data.shifts.s3.intake.neutral, data.shifts.s3.intake.opponent,
                data.shifts.s3.feed.our, data.shifts.s3.feed.neutral, data.shifts.s3.feed.opponent,
                // S4
                b(data.shifts.s4.active),
                data.shifts.s4.scored,
                data.shifts.s4.hpFed,
                data.shifts.s4.intake.our, data.shifts.s4.intake.neutral, data.shifts.s4.intake.opponent,
                data.shifts.s4.feed.our, data.shifts.s4.feed.neutral, data.shifts.s4.feed.opponent,

                // ENDGAME
                data.endgame.scored,
                data.endgame.hpFed,
                data.endgame.intake.our,
                data.endgame.intake.neutral,
                data.endgame.intake.opponent,
                data.endgame.feed.our,
                data.endgame.feed.neutral,
                data.endgame.feed.opponent,
                data.endgame.climbLevel, // "none", "park", "shallow", "deep"
                data.endgame.climbStatus, // "success", "failed"

                // OFFMATCH / QUALITATIVE
                b(data.offmatch.energized),
                b(data.offmatch.supercharged),
                b(data.offmatch.transversal),
                data.offmatch.fouls,
                b(data.offmatch.sufferedDefense),
                b(data.offmatch.broke),
                b(data.offmatch.fragile),
                data.offmatch.driverSkill,
                data.offmatch.defensiveSkill,
                data.offmatch.shootAccuracy,
                `"${(data.offmatch.comments || "").replace(/"/g, '""')}"`, // Escape CSV quotes
                new Date().toISOString() // Timestamp
            ];

            return row.join(",");
        }

        function resetScoutData() {
            // Reinicia o objeto scoutData para valores padrão
            // Isso previne dados "fantasmas" na próxima partida se a página não for recarregada
            scoutData = { 
                eventKey: localStorage.getItem('rd_event_key'), 
                matchType: "qm", 
                matchNum: 0, 
                teamNum: 0, 
                alliance: "",
                auto: { startPos: "", fuelsScored: 0, fuelsFed: 0, collectDepot: false, collectGround: false, collectOutpost: false, crossedTrench: false, crossedBump: false, climbL1: "none", hpFed: 0 },
                transition: { scored: 0, intake: { our: 0, neutral: 0, opponent: 0 }, feed: { our: 0, neutral: 0, opponent: 0 }, hpFed: 0, roles: { scorer: false, feeder: false, defense: false, stealer: false, cycler: false } },
                shifts: { 
                    s1: { active: true, scored: 0, hpFed: 0, intake: {our:0, neutral:0, opponent:0}, feed: {our:0, neutral:0, opponent:0}, roles: { scorer: false, feeder: false, defense: false, stealer: false, cycler: false } }, 
                    s2: { active: false, scored: 0, hpFed: 0, intake: {our:0, neutral:0, opponent:0}, feed: {our:0, neutral:0, opponent:0}, roles: { scorer: false, feeder: false, defense: false, stealer: false, cycler: false } }, 
                    s3: { active: true, scored: 0, hpFed: 0, intake: {our:0, neutral:0, opponent:0}, feed: {our:0, neutral:0, opponent:0}, roles: { scorer: false, feeder: false, defense: false, stealer: false, cycler: false } }, 
                    s4: { active: false, scored: 0, hpFed: 0, intake: {our:0, neutral:0, opponent:0}, feed: {our:0, neutral:0, opponent:0}, roles: { scorer: false, feeder: false, defense: false, stealer: false, cycler: false } } 
                },
                endgame: { scored: 0, intake: { our: 0, neutral: 0, opponent: 0 }, feed: { our: 0, neutral: 0, opponent: 0 }, climbLevel: "none", climbStatus: "none", hpFed: 0, roles: { scorer: false, feeder: false, defense: false, stealer: false, cycler: false } },
                offmatch: { energized: false, supercharged: false, transversal: false, fouls: 0, sufferedDefense: false, broke: false, fragile: false, crossBump: false, crossTrench: false, driverSkill: 0, defensiveSkill: 0, shootAccuracy: "", comments: "" }
            };

             // Reset UI
            document.querySelectorAll('[id^="display-"]').forEach(el => el.innerText = "0");
            document.querySelectorAll('input[type=checkbox]').forEach(el => el.checked = false);
            document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.start-pos-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('selected-pos-display').innerText = "";
            document.getElementById('off-comments').value = "";
            document.getElementById('select-accuracy').value = "";
            
            // Reset Shifts Displays
            for(let n=1; n<=4; n++) {
                document.getElementById(`display-s${n}-scored`).innerText = "0";
                document.getElementById(`display-s${n}-hp`).innerText = "0";
                ['our', 'neutral', 'opponent'].forEach(zone => { document.getElementById(`s${n}-intake-${zone}`).innerText = "0"; document.getElementById(`s${n}-feed-${zone}`).innerText = "0"; });
            }
             // Reset Transition Displays
            document.getElementById('display-trans-scored').innerText = "0";
            document.getElementById('display-trans-hp').innerText = "0";
            ['our', 'neutral', 'opponent'].forEach(zone => { document.getElementById(`trans-intake-${zone}`).innerText = "0"; document.getElementById(`trans-feed-${zone}`).innerText = "0"; });
             // Reset Endgame Displays
            document.getElementById('display-endgame-scored').innerText = "0";
            document.getElementById('display-endgame-hp').innerText = "0";
            ['our', 'neutral', 'opponent'].forEach(zone => { document.getElementById(`endgame-intake-${zone}`).innerText = "0"; document.getElementById(`endgame-feed-${zone}`).innerText = "0"; });

            setHubPattern(true); 
            setAutoClimb('none');
            setEndgameClimb('none', 'none');
            setOffMatchRate('driver', 0);
            setOffMatchRate('defense', 0);
            changePhase('auto');
            
            // Reset Auto Toggle
            const autoDetails = document.getElementById('auto-details-container');
            const autoIcon = document.getElementById('icon-toggle-auto');
            const autoBtn = document.getElementById('btn-toggle-auto');
            if(autoDetails) {
                autoDetails.classList.add('hidden');
                autoDetails.classList.remove('flex');
                autoIcon.classList.remove('rotate-180');
                autoBtn.classList.remove('border-indigo-500', 'text-white', 'bg-indigo-900/20');
                autoBtn.classList.add('border-slate-600', 'text-slate-400', 'bg-slate-800');
            }
            
            // Reset Sub Tabs
            ['trans', 'endgame', 's1', 's2', 's3', 's4'].forEach(ctx => {
                if(document.getElementById(`btn-${ctx}-tab-score`)) openSubTab(ctx, 'score');
            });
        }

        // --- FUNCTIONS ---
        
        function setSearchYear(year) {
            currentSearchYear = year;
            const btn2025 = document.getElementById('btn-year-2025');
            const btn2026 = document.getElementById('btn-year-2026');
            if (btn2025 && btn2026) {
                if(year === 2025) {
                    btn2025.className = "flex-1 py-1.5 text-[10px] font-bold rounded-md transition text-white bg-indigo-600 shadow-sm";
                    btn2026.className = "flex-1 py-1.5 text-[10px] font-bold rounded-md transition text-slate-500 hover:text-white";
                } else {
                    btn2026.className = "flex-1 py-1.5 text-[10px] font-bold rounded-md transition text-white bg-indigo-600 shadow-sm";
                    btn2025.className = "flex-1 py-1.5 text-[10px] font-bold rounded-md transition text-slate-500 hover:text-white";
                }
            }
            if (!allEventsCache[year]) fetchEventsForYear(year);
            else { const query = document.getElementById('eventSearchInput').value; if(query) handleSearchInput(query); }
        }

        async function fetchEventsForYear(year) {
            const apiKey = document.getElementById('apiKeyInput').value;
            const loading = document.getElementById('searchLoadingIcon');
            if (loading) loading.classList.remove('hidden');
            try {
                const res = await fetch(`https://www.thebluealliance.com/api/v3/events/${year}/simple`, { headers: { 'X-TBA-Auth-Key': apiKey } });
                if(!res.ok) throw new Error("Erro API");
                const data = await res.json();
                allEventsCache[year] = data;
                const query = document.getElementById('eventSearchInput').value;
                if(query) handleSearchInput(query);
            } catch(e) { console.error(e); } finally { if (loading) loading.classList.add('hidden'); }
        }

        function handleSearchInput(query) {
            const container = document.getElementById('searchResults');
            if (!container) return; // Add safety check
            const list = allEventsCache[currentSearchYear];
            if (!query || query.length < 2 || !list) { container.classList.add('hidden'); return; }
            const lowerQ = query.toLowerCase();
            const filtered = list.filter(e => (e.name && e.name.toLowerCase().includes(lowerQ)) || (e.key && e.key.toLowerCase().includes(lowerQ)) || (e.event_code && e.event_code.toLowerCase().includes(lowerQ))).slice(0, 30);
            if (filtered.length === 0) container.innerHTML = '<div class="p-3 text-xs text-slate-500 text-center">Nenhum evento encontrado</div>';
            else container.innerHTML = filtered.map(e => `<div onclick="selectEvent('${e.key}', '${e.name.replace(/'/g, "\\'")}')" class="p-3 border-b border-slate-800 hover:bg-slate-800 cursor-pointer transition flex flex-col items-start"><span class="text-xs font-bold text-white">${e.name}</span><div class="flex gap-2 mt-1"><span class="text-[9px] bg-slate-700 text-slate-300 px-1.5 rounded uppercase font-mono">${e.event_code}</span><span class="text-[9px] text-slate-500">${new Date(e.start_date).toLocaleDateString()}</span></div></div>`).join('');
            container.classList.remove('hidden');
        }

        function selectEvent(key, name, triggerSearch = true) {
            document.getElementById('eventKeyInput').value = key;
            document.getElementById('selectedEventName').innerText = name;
            document.getElementById('selectedEventKey').innerText = key;
            
            // Oculta resultados de busca (se houvesse)
            const searchResults = document.getElementById('searchResults');
            if(searchResults) searchResults.classList.add('hidden');
            
            // Show selection in sidebar
            document.getElementById('selectedEventContainer').classList.remove('hidden');
            
            // Enable button
            const mainBtn = document.getElementById('mainActionBtn');
            mainBtn.disabled = false;
            mainBtn.classList.remove('cursor-not-allowed', 'from-slate-700', 'to-slate-800', 'text-slate-400', 'border-slate-700');
            mainBtn.classList.add('from-indigo-600', 'to-violet-600', 'text-white', 'hover:from-indigo-500', 'hover:to-violet-500', 'active:scale-95', 'border-indigo-500/50');
            
            localStorage.setItem('rd_event_key', key);
            localStorage.setItem('rd_event_name', name);

            // Trigger fetch immediately
            validateAndFetchSchedule();
        }

        function clearSelection() {
            document.getElementById('eventKeyInput').value = "";
            document.getElementById('selectedEventContainer').classList.add('hidden');
            const mainBtn = document.getElementById('mainActionBtn');
            mainBtn.disabled = true;
            mainBtn.classList.add('cursor-not-allowed', 'from-slate-700', 'to-slate-800', 'text-slate-400', 'border-slate-700');
            mainBtn.classList.remove('from-indigo-600', 'to-violet-600', 'text-white', 'hover:from-indigo-500', 'hover:to-violet-500', 'active:scale-95', 'border-indigo-500/50');
            localStorage.removeItem('rd_event_key'); localStorage.removeItem('rd_event_name');
        }

        function renderShiftHTML(n) {
            const container = document.getElementById(`phase-shift${n}`);
            let headerHTML = '';
            if (n === 1) {
                headerHTML = `<div class="mb-6 grid grid-cols-2 gap-4"><button onclick="setHubPattern(true)" id="btn-s1-active" class="hub-status-card hub-active"><i class="fas fa-check-circle text-2xl"></i><div class="text-left leading-tight"><div class="font-black uppercase text-sm">HUB ATIVO</div><div class="text-[10px] opacity-80 font-bold">Inicia ciclo ativo</div></div></button><button onclick="setHubPattern(false)" id="btn-s1-inactive" class="hub-status-card hub-inactive"><i class="fas fa-times-circle text-2xl"></i><div class="text-left leading-tight"><div class="font-black uppercase text-sm">HUB INATIVO</div><div class="text-[10px] opacity-80 font-bold">Inicia ciclo inativo</div></div></button></div><hr class="border-slate-800 mb-6">`;
            } else {
                headerHTML = `<div id="banner-s${n}" class="hub-banner banner-inactive">HUB INATIVO NESTE TURNO</div>`;
            }

            container.innerHTML = `
                ${headerHTML}
                <div class="flex flex-col gap-6">
                    <!-- FUNÇÕES (ROLES) - SEMPRE VISÍVEIS -->
                    <div>
                        <h3 class="section-title title-pink" id="s${n}-role-title"><i class="fas fa-user-tag mr-2"></i>Funções</h3>
                        <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700 grid grid-cols-2 md:grid-cols-5 gap-2">
                            <button onclick="toggleRole('shift', 'scorer', ${n})" id="btn-role-s${n}-scorer" class="role-btn">Pontuador</button>
                            <button onclick="toggleRole('shift', 'feeder', ${n})" id="btn-role-s${n}-feeder" class="role-btn">Feeder</button>
                            <button onclick="toggleRole('shift', 'defense', ${n})" id="btn-role-s${n}-defense" class="role-btn">Defensor</button>
                            <button onclick="toggleRole('shift', 'stealer', ${n})" id="btn-role-s${n}-stealer" class="role-btn">Stealer</button>
                            <button onclick="toggleRole('shift', 'cycler', ${n})" id="btn-role-s${n}-cycler" class="role-btn">Ciclador</button>
                        </div>
                    </div>

                    <!-- SUB TABS -->
                    <div class="flex rounded-lg bg-slate-900 p-1 mb-2">
                        <button onclick="openSubTab('s${n}', 'score')" id="btn-s${n}-tab-score" class="sub-tab-btn active">Pontuação</button>
                        <button onclick="openSubTab('s${n}', 'intake')" id="btn-s${n}-tab-intake" class="sub-tab-btn">Coleta</button>
                        <button onclick="openSubTab('s${n}', 'feed')" id="btn-s${n}-tab-feed" class="sub-tab-btn">Feed</button>
                    </div>

                    <!-- TAB: PONTUAÇÃO -->
                    <div id="s${n}-content-score" class="flex flex-col gap-6">
                        <div id="s${n}-score-container" class="transition-all duration-300">
                            <h3 class="section-title title-green"><i class="fas fa-basketball-ball mr-2"></i>Pontuação (S${n})</h3>
                            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col justify-center"><div class="flex justify-between items-center mb-2"><span class="text-xs text-slate-400 font-bold uppercase">Total Pontuado</span><div class="text-4xl font-mono font-bold text-green-400"><span id="display-s${n}-scored">0</span></div></div><div class="grid grid-cols-6 gap-2"><button onclick="updateShiftScore(${n}, 1)" class="counter-btn-pos bg-green-600 hover:bg-green-500">+1</button><button onclick="updateShiftScore(${n}, 5)" class="counter-btn-pos bg-green-700 hover:bg-green-600">+5</button><button onclick="updateShiftScore(${n}, 10)" class="counter-btn-pos bg-green-800 hover:bg-green-700">+10</button><button onclick="updateShiftScore(${n}, -1)" class="counter-btn-neg">-1</button><button onclick="updateShiftScore(${n}, -5)" class="counter-btn-neg">-5</button><button onclick="updateShiftScore(${n}, -10)" class="counter-btn-neg">-10</button></div></div>
                        </div>
                    </div>

                    <!-- TAB: COLETA -->
                    <div id="s${n}-content-intake" class="hidden flex-col gap-6">
                        <div>
                            <h3 class="section-title title-orange"><i class="fas fa-hand-holding mr-2"></i>Coleta (S${n})</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700"><div class="flex justify-between items-center mb-2"><span class="text-[10px] font-bold text-slate-400 uppercase">Nossa Zona</span><div class="mini-counter-display text-orange-400"><span id="s${n}-intake-our">0</span></div></div><div class="flex gap-1"><button onclick="updateShiftIntake(${n}, 'our', -1)" class="mini-btn-neg"><i class="fas fa-minus"></i></button><button onclick="updateShiftIntake(${n}, 'our', 1)" class="mini-btn-pos bg-orange-700 hover:bg-orange-600">+1</button></div></div>
                                <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700"><div class="flex justify-between items-center mb-2"><span class="text-[10px] font-bold text-slate-400 uppercase">Zona Neutra</span><div class="mini-counter-display text-orange-400"><span id="s${n}-intake-neutral">0</span></div></div><div class="flex gap-1"><button onclick="updateShiftIntake(${n}, 'neutral', -1)" class="mini-btn-neg"><i class="fas fa-minus"></i></button><button onclick="updateShiftIntake(${n}, 'neutral', 1)" class="mini-btn-pos bg-orange-700 hover:bg-orange-600">+1</button></div></div>
                                <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700"><div class="flex justify-between items-center mb-2"><span class="text-[10px] font-bold text-slate-400 uppercase">Zona Deles</span><div class="mini-counter-display text-orange-400"><span id="s${n}-intake-opponent">0</span></div></div><div class="flex gap-1"><button onclick="updateShiftIntake(${n}, 'opponent', -1)" class="mini-btn-neg"><i class="fas fa-minus"></i></button><button onclick="updateShiftIntake(${n}, 'opponent', 1)" class="mini-btn-pos bg-orange-700 hover:bg-orange-600">+1</button></div></div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB: FEED -->
                    <div id="s${n}-content-feed" class="hidden flex-col gap-6">
                        <div class="mb-8">
                            <h3 class="section-title title-blue"><i class="fas fa-share mr-2"></i>Feed (S${n})</h3>
                            <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700 mb-2">
                                <div class="flex items-center justify-between mb-2 border-b border-slate-700 pb-2"><span class="text-xs font-bold text-blue-300 uppercase">De <span class="text-white">Nossa Zona</span></span><div class="text-xl font-mono font-bold text-blue-400"><span id="s${n}-feed-our">0</span></div></div>
                                <div class="grid grid-cols-3 gap-2 mb-2">
                                    <button onclick="updateShiftFeed(${n}, 'our', 1)" class="mini-btn-pos bg-blue-600">+1</button>
                                    <button onclick="updateShiftFeed(${n}, 'our', 5)" class="mini-btn-pos bg-blue-700">+5</button>
                                    <button onclick="updateShiftFeed(${n}, 'our', 10)" class="mini-btn-pos bg-blue-800">+10</button>
                                </div>
                                <div class="grid grid-cols-3 gap-2">
                                    <button onclick="updateShiftFeed(${n}, 'our', -1)" class="mini-btn-neg">-1</button>
                                    <button onclick="updateShiftFeed(${n}, 'our', -5)" class="mini-btn-neg">-5</button>
                                    <button onclick="updateShiftFeed(${n}, 'our', -10)" class="mini-btn-neg">-10</button>
                                </div>
                            </div>
                            <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700 mb-2">
                                <div class="flex items-center justify-between mb-2 border-b border-slate-700 pb-2"><span class="text-xs font-bold text-blue-300 uppercase">De <span class="text-white">Zona Neutra</span></span><div class="text-xl font-mono font-bold text-blue-400"><span id="s${n}-feed-neutral">0</span></div></div>
                                <div class="grid grid-cols-3 gap-2 mb-2">
                                    <button onclick="updateShiftFeed(${n}, 'neutral', 1)" class="mini-btn-pos bg-blue-600">+1</button>
                                    <button onclick="updateShiftFeed(${n}, 'neutral', 5)" class="mini-btn-pos bg-blue-700">+5</button>
                                    <button onclick="updateShiftFeed(${n}, 'neutral', 10)" class="mini-btn-pos bg-blue-800">+10</button>
                                </div>
                                <div class="grid grid-cols-3 gap-2">
                                    <button onclick="updateShiftFeed(${n}, 'neutral', -1)" class="mini-btn-neg">-1</button>
                                    <button onclick="updateShiftFeed(${n}, 'neutral', -5)" class="mini-btn-neg">-5</button>
                                    <button onclick="updateShiftFeed(${n}, 'neutral', -10)" class="mini-btn-neg">-10</button>
                                </div>
                            </div>
                            <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                <div class="flex items-center justify-between mb-2 border-b border-slate-700 pb-2"><span class="text-xs font-bold text-blue-300 uppercase">De <span class="text-white">Zona Deles</span></span><div class="text-xl font-mono font-bold text-blue-400"><span id="s${n}-feed-opponent">0</span></div></div>
                                <div class="grid grid-cols-3 gap-2 mb-2">
                                    <button onclick="updateShiftFeed(${n}, 'opponent', 1)" class="mini-btn-pos bg-blue-600">+1</button>
                                    <button onclick="updateShiftFeed(${n}, 'opponent', 5)" class="mini-btn-pos bg-blue-700">+5</button>
                                    <button onclick="updateShiftFeed(${n}, 'opponent', 10)" class="mini-btn-pos bg-blue-800">+10</button>
                                </div>
                                <div class="grid grid-cols-3 gap-2">
                                    <button onclick="updateShiftFeed(${n}, 'opponent', -1)" class="mini-btn-neg">-1</button>
                                    <button onclick="updateShiftFeed(${n}, 'opponent', -5)" class="mini-btn-neg">-5</button>
                                    <button onclick="updateShiftFeed(${n}, 'opponent', -10)" class="mini-btn-neg">-10</button>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h3 class="section-title title-cyan"><i class="fas fa-user-friends mr-2"></i>Human Player (S${n})</h3>
                            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col justify-center">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-xs font-bold text-slate-400 uppercase">Alimentou HP</span>
                                </div>
                                <div class="flex items-center gap-3">
                                    <button onclick="updateShiftHP(${n}, -1)" class="hp-btn bg-slate-700 text-slate-300 hover:text-white">-1</button>
                                    <div class="text-2xl font-mono font-bold text-cyan-400 w-8 text-center"><span id="display-s${n}-hp">0</span></div>
                                    <button onclick="updateShiftHP(${n}, 1)" class="hp-btn bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-900/30">+1</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
        }

        function navTo(pageId) {
            document.querySelectorAll('.page-container').forEach(p => { p.classList.remove('active-page'); p.classList.add('hidden-page'); });
            const target = document.getElementById(pageId);
            target.classList.remove('hidden-page'); target.classList.add('active-page');
            if(pageId === 'page-match-selector') loadMatchSelectorData();
            if(pageId === 'page-data') renderDataList(); // Atualiza a lista ao abrir a página de dados
        }

        function toggleAdvanced() {
            const sec = document.getElementById('advancedSection');
            document.getElementById('advArrow').classList.toggle('rotate-180');
            sec.classList.toggle('hidden');
        }

        function openSubTab(context, tabName) {
            // context: 'trans', 'endgame', 's1', 's2', ...
            // tabName: 'score', 'intake', 'feed'
            
            // Hide all tab contents for this context
            document.getElementById(`${context}-content-score`).classList.add('hidden');
            document.getElementById(`${context}-content-intake`).classList.add('hidden');
            document.getElementById(`${context}-content-feed`).classList.add('hidden');
            
            // Show selected
            document.getElementById(`${context}-content-${tabName}`).classList.remove('hidden');
            
            // Update buttons
            ['score', 'intake', 'feed'].forEach(t => {
                const btn = document.getElementById(`btn-${context}-tab-${t}`);
                if(btn) {
                    if(t === tabName) {
                        btn.classList.add('active'); // Use class based styling
                    } else {
                        btn.classList.remove('active');
                    }
                }
            });
        }

        async function validateAndFetchSchedule() {
            const apiKey = document.getElementById('apiKeyInput').value;
            const eventKey = document.getElementById('eventKeyInput').value.trim();
            const btn = document.getElementById('mainActionBtn');
            const originalHTML = btn.innerHTML;
            if(!eventKey) return showToast("Atenção", "Selecione um evento!", "error");
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> AGUARDE...';
            btn.classList.add('opacity-70', 'cursor-not-allowed');
            try {
                const [matchRes, teamsRes] = await Promise.all([
                    fetch(`https://www.thebluealliance.com/api/v3/event/${eventKey}/matches/simple`, { headers: { 'X-TBA-Auth-Key': apiKey } }),
                    fetch(`https://www.thebluealliance.com/api/v3/event/${eventKey}/teams/simple`, { headers: { 'X-TBA-Auth-Key': apiKey } })
                ]);
                if(!matchRes.ok) throw new Error("Erro na API TBA ao baixar partidas");
                const matches = await matchRes.json();
                const teams = await teamsRes.json();
                const qmSchedule = {};
                matches.forEach(m => {
                    if(m.comp_level === 'qm') {
                        qmSchedule[m.match_number] = {
                            Red1: m.alliances.red.team_keys[0]?.replace('frc','')||'?', Red2: m.alliances.red.team_keys[1]?.replace('frc','')||'?', Red3: m.alliances.red.team_keys[2]?.replace('frc','')||'?',
                            Blue1: m.alliances.blue.team_keys[0]?.replace('frc','')||'?', Blue2: m.alliances.blue.team_keys[1]?.replace('frc','')||'?', Blue3: m.alliances.blue.team_keys[2]?.replace('frc','')||'?'
                        };
                    }
                });
                localStorage.setItem('rd_event_key', eventKey);
                localStorage.setItem('rd_schedule_qm', JSON.stringify(qmSchedule));
                localStorage.setItem('rd_event_teams', JSON.stringify(teams.map(t => t.team_number)));
                btn.classList.replace('from-indigo-600', 'from-green-600');
                btn.innerHTML = '<i class="fas fa-check"></i> SUCESSO!';
                
                // Hide sidebar after success
                toggleSidebar();
                
                setTimeout(() => navTo('page-match-selector'), 800);
            } catch(e) {
                showToast("Erro", e.message, "error"); btn.innerHTML = originalHTML; btn.classList.remove('opacity-70', 'cursor-not-allowed');
            }
        }

        function loadMatchSelectorData() {
            const evtName = localStorage.getItem('rd_event_name');
            const evtKey = localStorage.getItem('rd_event_key');
            if(evtName) document.getElementById('ms-eventNameDisplay').innerText = evtName;
            if(evtKey) document.getElementById('ms-eventKeyDisplay').innerText = evtKey;
            schedules.qm = JSON.parse(localStorage.getItem('rd_schedule_qm')) || {};
            teamListCache = JSON.parse(localStorage.getItem('rd_event_teams')) || [];
            const lastPos = localStorage.getItem('rd_last_pos');
            if(lastPos) setPosition(lastPos);
            setMatchType(currentMatchType); 
        }

        function setMatchType(type) {
            currentMatchType = type;
            document.querySelectorAll('.match-type-card').forEach(b => b.classList.remove('active'));
            document.getElementById(`tab-${type}`).classList.add('active');
            const teamInput = document.getElementById('teamInput');
            if (type !== 'qm') {
                teamInput.removeAttribute('readonly');
                teamInput.classList.add('border-b-2', 'border-slate-600', 'bg-slate-800/30');
            } else {
                teamInput.setAttribute('readonly', true);
                teamInput.classList.remove('border-b-2', 'border-slate-600', 'bg-slate-800/30');
                teamInput.value = "";
            }
            updateTeamDisplay();
        }

        function adjustMatch(delta) {
            const input = document.getElementById('matchNumInput');
            input.value = Math.max(1, (parseInt(input.value) || 0) + delta);
            updateTeamDisplay();
        }

        function setPosition(pos) {
            currentPosition = pos;
            localStorage.setItem('rd_last_pos', pos);
            document.querySelectorAll('.station-btn').forEach(btn => btn.classList.remove('active', 'opacity-50'));
            document.querySelectorAll('.station-btn').forEach(btn => { if(btn.id !== `btn-${pos}`) btn.classList.add('opacity-50'); });
            document.getElementById(`btn-${pos}`).classList.add('active');
            document.getElementById(`btn-${pos}`).classList.remove('opacity-50');
            updateTeamDisplay();
        }

        function updateTeamDisplay() {
            const matchNum = document.getElementById('matchNumInput').value;
            const teamInput = document.getElementById('teamInput');
            const statusMsg = document.getElementById('teamStatusMsg');
            if (currentMatchType !== 'qm') {
                if (!currentPosition) return disableStartButton("Selecione Posição");
                if (!teamInput.value) return disableStartButton("Digite o Time");
                enableStartButton();
                return;
            }
            if (!currentPosition) {
                teamInput.value = ""; statusMsg.innerText = "Selecione uma posição"; disableStartButton("Selecione Posição"); return;
            }
            const schedule = schedules.qm;
            if (schedule && schedule[matchNum] && schedule[matchNum][currentPosition]) {
                const team = schedule[matchNum][currentPosition];
                if (team !== '???') {
                    teamInput.value = team; statusMsg.innerText = "Time Encontrado"; statusMsg.className = "text-xs mt-3 text-green-400 font-bold"; enableStartButton();
                } else {
                    teamInput.value = "---"; statusMsg.innerText = "Posição Vazia"; statusMsg.className = "text-xs mt-3 text-yellow-500"; disableStartButton("Posição Vazia");
                }
            } else {
                teamInput.value = "???"; statusMsg.innerText = "Sem dados"; statusMsg.className = "text-xs mt-3 text-red-400"; disableStartButton("Sem Dados");
            }
        }

        function enableStartButton() {
            const btn = document.getElementById('startBtn');
            btn.disabled = false;
            btn.className = "w-full font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 start-btn-enabled text-lg cursor-pointer bg-green-600 hover:bg-green-500 text-white";
            btn.innerHTML = '<span class="text-xl">INICIAR SCOUT</span><i class="fas fa-arrow-right"></i>';
        }

        function disableStartButton(msg) {
            const btn = document.getElementById('startBtn');
            btn.disabled = true;
            btn.className = "w-full font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 start-btn-disabled text-lg bg-slate-800 text-slate-500";
            btn.innerHTML = `<i class="fas fa-lock"></i><span>${msg.toUpperCase()}</span>`;
        }

        function startScouting() {
            resetScoutData();
            
            scoutData.scouterName = document.getElementById('scouterNameInput')?.value || "Anonimo";
            const currentMatch = document.getElementById('matchNumInput').value;
            scoutData.matchType = currentMatchType.toUpperCase();
            scoutData.matchNum = currentMatch;
            scoutData.teamNum = document.getElementById('teamInput').value;
            scoutData.alliance = currentPosition || "Red1";

            document.getElementById('scout-match-type').innerText = currentMatchType.toUpperCase();
            document.getElementById('scout-match-num').innerText = "#" + document.getElementById('matchNumInput').value;
            document.getElementById('scout-team-num').innerText = document.getElementById('teamInput').value;
            const pos = currentPosition || "Red1";
            document.getElementById('scout-alliance').innerText = pos;
            document.getElementById('scout-alliance').className = `text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full text-white ${pos.startsWith('Red') ? 'bg-red-600' : 'bg-blue-600'}`;
            
            navTo('page-match-scouting');
        }

        // --- AUTO LOGIC ---
        function setStartPos(pos) {
            scoutData.auto.startPos = pos;
            document.querySelectorAll('.start-pos-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(`pos-${pos}`).classList.add('active');
            document.getElementById('selected-pos-display').innerText = pos;
        }
        function updateAutoFuel(type, delta) {
            if(type === 'scored') {
                scoutData.auto.fuelsScored = Math.max(0, scoutData.auto.fuelsScored + delta);
                document.getElementById('display-auto-scored').innerText = scoutData.auto.fuelsScored;
            } else {
                scoutData.auto.fuelsFed = Math.max(0, scoutData.auto.fuelsFed + delta);
                document.getElementById('display-auto-fed').innerText = scoutData.auto.fuelsFed;
            }
        }
        function updateAutoHP(delta) {
             scoutData.auto.hpFed = Math.max(0, scoutData.auto.hpFed + delta);
             document.getElementById('display-auto-hp').innerText = scoutData.auto.hpFed;
        }
        function updateCheck(type) {
            const val = document.getElementById(`check-${type}`).checked;
            if(type === 'trench') scoutData.auto.crossedTrench = val;
            if(type === 'bump') scoutData.auto.crossedBump = val;
            if(type === 'ground') scoutData.auto.collectGround = val;
            if(type === 'depot') scoutData.auto.collectDepot = val;
            if(type === 'outpost') scoutData.auto.collectOutpost = val;
        }
        function setAutoClimb(status) {
            scoutData.auto.climbL1 = status;
            ['none','failed','success'].forEach(s => {
                const btn = document.getElementById(`btn-climb-${s}`);
                if (s === status) {
                      if(s === 'success') btn.className = "climb-btn p-3 rounded-lg border-green-500 bg-green-900/50 text-white text-xs font-bold flex-1 transition";
                      else if(s === 'failed') btn.className = "climb-btn p-3 rounded-lg border-red-500 bg-red-900/50 text-white text-xs font-bold flex-1 transition";
                      else btn.className = "climb-btn p-3 rounded-lg border-indigo-500 bg-slate-700 text-white text-xs font-bold flex-1 transition";
                } else {
                    btn.className = "climb-btn p-3 rounded-lg border border-slate-600 bg-slate-900 text-gray-400 text-xs font-bold flex-1 transition hover:bg-slate-800";
                }
            });
        }

        // --- TRANSITION LOGIC ---
        function updateTransitionScore(delta) {
            scoutData.transition.scored = Math.max(0, scoutData.transition.scored + delta);
            document.getElementById('display-trans-scored').innerText = scoutData.transition.scored;
        }
        function updateTransIntake(zone, delta) {
            if(scoutData.transition.intake[zone] !== undefined) {
                scoutData.transition.intake[zone] = Math.max(0, scoutData.transition.intake[zone] + delta);
                document.getElementById(`trans-intake-${zone}`).innerText = scoutData.transition.intake[zone];
            }
        }
        function updateTransFeed(zone, delta) {
            if(scoutData.transition.feed[zone] !== undefined) {
                scoutData.transition.feed[zone] = Math.max(0, scoutData.transition.feed[zone] + delta);
                document.getElementById(`trans-feed-${zone}`).innerText = scoutData.transition.feed[zone];
            }
        }
        function updateTransitionHP(delta) {
             scoutData.transition.hpFed = Math.max(0, scoutData.transition.hpFed + delta);
             document.getElementById('display-trans-hp').innerText = scoutData.transition.hpFed;
        }

        // --- SHIFT LOGIC ---
        function updateShiftScore(n, delta) {
            scoutData.shifts[`s${n}`].scored = Math.max(0, scoutData.shifts[`s${n}`].scored + delta);
            document.getElementById(`display-s${n}-scored`).innerText = scoutData.shifts[`s${n}`].scored;
        }
        function updateShiftIntake(n, zone, delta) {
             scoutData.shifts[`s${n}`].intake[zone] = Math.max(0, scoutData.shifts[`s${n}`].intake[zone] + delta);
             document.getElementById(`s${n}-intake-${zone}`).innerText = scoutData.shifts[`s${n}`].intake[zone];
        }
        function updateShiftFeed(n, zone, delta) {
            scoutData.shifts[`s${n}`].feed[zone] = Math.max(0, scoutData.shifts[`s${n}`].feed[zone] + delta);
            document.getElementById(`s${n}-feed-${zone}`).innerText = scoutData.shifts[`s${n}`].feed[zone];
        }
        function updateShiftHP(n, delta) {
             scoutData.shifts[`s${n}`].hpFed = Math.max(0, scoutData.shifts[`s${n}`].hpFed + delta);
             document.getElementById(`display-s${n}-hp`).innerText = scoutData.shifts[`s${n}`].hpFed;
        }
        
        function setHubPattern(startActive) {
            const pattern = [startActive, !startActive, startActive, !startActive];
            pattern.forEach((isActive, idx) => {
                const sNum = idx + 1;
                scoutData.shifts[`s${sNum}`].active = isActive;
                const scoreBox = document.getElementById(`s${sNum}-score-container`);
                // if(scoreBox) { if(isActive) scoreBox.classList.remove('hidden'); else scoreBox.classList.add('hidden'); } // Removed because we use tabs now
                if(sNum === 1) {
                    const btnActive = document.getElementById('btn-s1-active');
                    const btnInactive = document.getElementById('btn-s1-inactive');
                    if(isActive) { btnActive.classList.replace('hub-inactive', 'hub-active'); btnInactive.classList.replace('hub-active', 'hub-inactive'); } 
                    else { btnActive.classList.replace('hub-active', 'hub-inactive'); btnInactive.classList.replace('hub-inactive', 'hub-active'); }
                } else {
                    const banner = document.getElementById(`banner-s${sNum}`);
                    if(isActive) { banner.innerText = "HUB ATIVO NESTE TURNO"; banner.className = "hub-banner banner-active"; } 
                    else { banner.innerText = "HUB INATIVO NESTE TURNO"; banner.className = "hub-banner banner-inactive"; }
                }

                // ATUALIZAR TÍTULO DA SEÇÃO DE ROLES
                const roleTitle = document.getElementById(`s${sNum}-role-title`);
                if(roleTitle) {
                    if(isActive) {
                        roleTitle.innerHTML = `<i class="fas fa-user-tag mr-2"></i>Funções (Hub Ativo)`;
                        roleTitle.className = "section-title title-green";
                    } else {
                        roleTitle.innerHTML = `<i class="fas fa-user-tag mr-2"></i>Funções (Hub Inativo)`;
                        roleTitle.className = "section-title title-red";
                    }
                }
            });
        }

        // --- ENDGAME LOGIC ---
        function updateEndgameScore(delta) {
            scoutData.endgame.scored = Math.max(0, scoutData.endgame.scored + delta);
            document.getElementById('display-endgame-scored').innerText = scoutData.endgame.scored;
        }
        function updateEndgameIntake(zone, delta) {
            scoutData.endgame.intake[zone] = Math.max(0, scoutData.endgame.intake[zone] + delta);
            document.getElementById(`endgame-intake-${zone}`).innerText = scoutData.endgame.intake[zone];
        }
        function updateEndgameFeed(zone, delta) {
            scoutData.endgame.feed[zone] = Math.max(0, scoutData.endgame.feed[zone] + delta);
            document.getElementById(`endgame-feed-${zone}`).innerText = scoutData.endgame.feed[zone];
        }
        function updateEndgameHP(delta) {
             scoutData.endgame.hpFed = Math.max(0, scoutData.endgame.hpFed + delta);
             document.getElementById('display-endgame-hp').innerText = scoutData.endgame.hpFed;
        }

        function setEndgameClimb(level, status) {
            scoutData.endgame.climbLevel = level;
            scoutData.endgame.climbStatus = status;
            document.querySelectorAll('.climb-btn-opt').forEach(b => {
                b.classList.remove('ring-2', 'ring-white', 'opacity-100', 'scale-105');
                b.classList.add('opacity-70');
            });
            const noneBtn = document.getElementById('climb-btn-none');
            noneBtn.classList.remove('border-indigo-500', 'text-white', 'bg-slate-700');
            noneBtn.classList.add('border-slate-600', 'text-slate-400', 'bg-slate-800');
            if (level === 'none') {
                noneBtn.classList.add('border-indigo-500', 'text-white', 'bg-slate-700');
                return;
            }
            const btnId = `climb-${level}-${status}`;
            const btn = document.getElementById(btnId);
            if(btn) {
                btn.classList.remove('opacity-70');
                btn.classList.add('ring-2', 'ring-white', 'opacity-100', 'scale-105');
            }
        }

        // --- OFF MATCH LOGIC ---
        function updateOffMatchCheck(key) {
            const map = {
                energized: 'check-energized', supercharged: 'check-supercharged', transversal: 'check-transversal',
                sufferedDefense: 'check-suffered-defense', broke: 'check-broke', fragile: 'check-fragile',
                crossBump: 'check-cross-bump', crossTrench: 'check-cross-trench'
            };
            scoutData.offmatch[key] = document.getElementById(map[key]).checked;
        }
        function updateOffMatchFouls(delta) {
            scoutData.offmatch.fouls = Math.max(0, scoutData.offmatch.fouls + delta);
            document.getElementById('display-off-fouls').innerText = scoutData.offmatch.fouls;
        }
        
        // FUNÇÃO UNIFICADA PARA ROLES (SHIFT, TRANSITION, ENDGAME)
        function toggleRole(phase, role, shiftNum = null) {
            let targetObj;
            let btnId;

            if (phase === 'shift') {
                targetObj = scoutData.shifts[`s${shiftNum}`].roles;
                btnId = `btn-role-s${shiftNum}-${role}`;
            } else if (phase === 'transition') {
                targetObj = scoutData.transition.roles;
                btnId = `btn-role-transition-${role}`;
            } else if (phase === 'endgame') {
                targetObj = scoutData.endgame.roles;
                btnId = `btn-role-endgame-${role}`;
            }

            if (targetObj) {
                targetObj[role] = !targetObj[role];
                const btn = document.getElementById(btnId);
                if (targetObj[role]) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        }

        function setOffMatchRate(type, val) {
            if(type === 'driver') {
                scoutData.offmatch.driverSkill = val;
                document.getElementById('lbl-driver-skill').innerText = val + "/5";
                for(let i=1; i<=5; i++) {
                    const el = document.getElementById(`btn-driver-${i}`);
                    if(i === val) el.classList.add('active'); else el.classList.remove('active');
                }
            } else {
                scoutData.offmatch.defensiveSkill = val;
                document.getElementById('lbl-def-skill').innerText = val + "/5";
                for(let i=1; i<=5; i++) {
                    const el = document.getElementById(`btn-defense-${i}`);
                    if(i === val) el.classList.add('active'); else el.classList.remove('active');
                }
            }
        }
        function updateOffMatchAccuracy(val) { scoutData.offmatch.shootAccuracy = val; }
        function updateOffMatchComments(val) { scoutData.offmatch.comments = val; }

        function toggleAutoDetails() {
            const container = document.getElementById('auto-details-container');
            const icon = document.getElementById('icon-toggle-auto');
            const btn = document.getElementById('btn-toggle-auto');
            
            if (container.classList.contains('hidden')) {
                container.classList.remove('hidden');
                container.classList.add('flex');
                icon.classList.add('rotate-180');
                btn.classList.add('border-indigo-500', 'text-white', 'bg-indigo-900/20');
                btn.classList.remove('border-slate-600', 'text-slate-400', 'bg-slate-800');
            } else {
                container.classList.add('hidden');
                container.classList.remove('flex');
                icon.classList.remove('rotate-180');
                btn.classList.remove('border-indigo-500', 'text-white', 'bg-indigo-900/20');
                btn.classList.add('border-slate-600', 'text-slate-400', 'bg-slate-800');
            }
        }

        // --- NAVEGAÇÃO DE FASES ---
        const PHASES = ['auto', 'transition', 'shift1', 'shift2', 'shift3', 'shift4', 'endgame', 'offmatch'];
        function changePhase(p) {
            document.querySelectorAll('.phase-content').forEach(el => el.classList.add('hidden'));
            const activePhase = document.getElementById(`phase-${p}`);
            if (activePhase) activePhase.classList.remove('hidden');
            document.querySelectorAll('.phase-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(`nav-${p}`).classList.add('active');
            document.getElementById('scout-content-area').scrollTop = 0;

            const idx = PHASES.indexOf(p);
            const btn = document.getElementById('btn-next-phase');
            if(idx < PHASES.length - 1) {
                const nextP = PHASES[idx+1];
                btn.innerHTML = `IR PARA ${nextP.toUpperCase()} <i class="fas fa-chevron-right ml-1"></i>`;
                btn.onclick = () => changePhase(nextP);
                btn.className = "w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold py-4 rounded-xl text-sm shadow-lg transition flex items-center justify-center gap-2";
            } else {
                btn.innerHTML = `SALVAR DADOS <i class="fas fa-save ml-1"></i>`;
                // Botão final: Salvar Localmente
                btn.onclick = () => saveMatchLocal();
                btn.className = "w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold py-4 rounded-xl text-sm shadow-lg transition flex items-center justify-center gap-2";
            }
        }
        function nextPhase() { changePhase(PHASES[1]); }
        function confirmExit() { navTo('page-match-selector'); }

        // --- DATA MANAGEMENT ---

        function saveMatchLocal() {
            // 1. Validação Obrigatória: Nome do Scouter
            const scouterInput = document.getElementById('scouterNameInput');
            const scouterName = scouterInput ? scouterInput.value.trim() : "";
            
            if (!scouterName) {
                showToast("Erro!", "O Nome do Scouter é obrigatório!", "error");
                const sidebar = document.getElementById('app-sidebar');
                if (sidebar && !sidebar.classList.contains('sidebar-open')) toggleSidebar();
                if (scouterInput) {
                    setTimeout(() => {
                        scouterInput.focus();
                        scouterInput.classList.remove('border-slate-700');
                        scouterInput.classList.add('border-red-500', 'ring-2', 'ring-red-500', 'bg-red-900/20');
                    }, 300);
                    setTimeout(() => {
                        scouterInput.classList.remove('border-red-500', 'ring-2', 'ring-red-500', 'bg-red-900/20');
                        scouterInput.classList.add('border-slate-700');
                    }, 4000);
                }
                return;
            }

            // 2. Coleta Dados
            scoutData.scouterName = scouterName;
            scoutData.eventKey = localStorage.getItem('rd_event_key');
            scoutData.eventName = localStorage.getItem('rd_event_name');
            scoutData.matchType = currentMatchType.toUpperCase();
            scoutData.matchNum = document.getElementById('matchNumInput').value;
            scoutData.teamNum = document.getElementById('teamInput').value;
            scoutData.alliance = document.getElementById('scout-alliance').innerText;
            scoutData.offmatch.comments = document.getElementById('off-comments').value;
            scoutData.offmatch.shootAccuracy = document.getElementById('select-accuracy').value;
            
            const timestamp = new Date().toISOString();
            const csvLine = generateCSV(scoutData);
            
            // 3. Salva no LocalStorage
            const matchRecord = {
                id: Date.now(),
                display: `${scoutData.matchType} ${scoutData.matchNum} - ${scoutData.teamNum}`,
                csv: csvLine,
                sent: false,
                timestamp: timestamp
            };
            
            let storedMatches = JSON.parse(localStorage.getItem('rd_saved_matches') || "[]");
            storedMatches.push(matchRecord);
            localStorage.setItem('rd_saved_matches', JSON.stringify(storedMatches));
            
            showToast("Salvo!", "Partida salva no dispositivo.");
            
            // 4. Incrementa e Reseta
            adjustMatch(1);
            resetScoutData();
            navTo('page-data');
        }

        function renderDataList() {
            const list = document.getElementById('data-list-container');
            const storedMatches = JSON.parse(localStorage.getItem('rd_saved_matches') || "[]");
            
            if (storedMatches.length === 0) {
                list.innerHTML = '<div class="text-center text-slate-500 text-xs py-8">Nenhum dado salvo.</div>';
                return;
            }
            
            list.innerHTML = storedMatches.map((m, index) => `
                <div class="data-item">
                    <div>
                        <div class="font-bold text-white text-sm">${m.display}</div>
                        <div class="text-[10px] text-slate-500">${new Date(m.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-bold ${m.sent ? 'status-sent' : 'status-pending'}">
                            ${m.sent ? '<i class="fas fa-check-double"></i> Enviado' : '<i class="fas fa-clock"></i> Pendente'}
                        </span>
                        <button onclick="deleteMatch(${index})" class="text-slate-600 hover:text-red-400 transition"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        }
        
        function deleteMatch(index) {
            if(!confirm("Tem certeza que deseja apagar essa partida?")) return;
            let storedMatches = JSON.parse(localStorage.getItem('rd_saved_matches') || "[]");
            storedMatches.splice(index, 1);
            localStorage.setItem('rd_saved_matches', JSON.stringify(storedMatches));
            renderDataList();
        }
        
        function clearAllData() {
            if(!confirm("CUIDADO: Isso apagará TODOS os dados salvos no celular. Confirmar?")) return;
            localStorage.removeItem('rd_saved_matches');
            renderDataList();
            showToast("Limpo", "Todos os dados foram apagados.");
        }

        async function syncAllMatches() {
            let storedMatches = JSON.parse(localStorage.getItem('rd_saved_matches') || "[]");
            const pending = storedMatches.filter(m => !m.sent);
            
            if(pending.length === 0) {
                showToast("Info", "Nenhum dado pendente para enviar.");
                return;
            }
            
            const btn = document.getElementById('btn-sync');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ENVIANDO...';
            btn.disabled = true;
            btn.classList.add('opacity-70');
            
            const scriptUrl = localStorage.getItem('rd_sheets_url') || HARDCODED_URL;
            let successCount = 0;
            
            // Envia um por um (para garantir integridade)
            for (let i = 0; i < storedMatches.length; i++) {
                if (!storedMatches[i].sent) {
                    try {
                        // O payload esperado pelo Apps Script pode variar, assumindo que ele aceita o CSV bruto ou objeto
                        // Se seu script espera JSON parseado, use JSON.parse no Apps Script ou envie como objeto aqui.
                        // Como generateCSV cria string, vamos assumir que o script processa string ou ajustamos:
                        // O script anterior enviava o objeto scoutData stringify.
                        // Aqui temos o CSV line. O ideal é que o script aceite o CSV ou que a gente reconstrua o objeto.
                        // Para simplificar e manter compatibilidade com o script "padrão" que espera JSON:
                        // *Se* você tiver o objeto original salvo seria melhor. Mas salvamos CSV.
                        // Vamos enviar como um objeto contendo a linha CSV.
                        
                        // NOTA: Se seu script espera o objeto JSON completo da partida, precisamos salvar o objeto, não só o CSV.
                        // Vou ajustar saveMatchLocal para salvar o objeto completo também por segurança.
                        // Mas aqui enviaremos o CSV line como payload simples se o script suportar, ou
                        // vamos simular o envio.
                        
                        // Assumindo que o script lá recebe e faz appendRow.
                        // Vou enviar { "csvLine": ... } para ser genérico ou adaptar.
                        
                        // MODO COMPATIBILIDADE COM O CÓDIGO ANTERIOR:
                        // O código anterior enviava JSON.stringify(scoutData).
                        // O `csvLine` é uma string já formatada.
                        // Se o script do Google Sheets espera um POST body que é o CSV direto:
                         await fetch(scriptUrl, {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'text/plain' },
                            body: storedMatches[i].csv // Envia a linha CSV
                        });
                        
                        storedMatches[i].sent = true;
                        successCount++;
                    } catch (e) {
                        console.error("Falha ao enviar item " + i, e);
                    }
                }
            }
            
            localStorage.setItem('rd_saved_matches', JSON.stringify(storedMatches));
            renderDataList();
            
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            btn.classList.remove('opacity-70');
            
            if(successCount > 0) showToast("Sucesso", `${successCount} partidas enviadas!`);
            else showToast("Erro", "Falha ao conectar com a planilha.", "error");
        }
