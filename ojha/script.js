document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';

    // --- Core UI Helpers ---
    const getEl = id => document.getElementById(id);

    // --- Geolocation ---
    getEl('get-location').addEventListener('click', () => {
        const btn = getEl('get-location');
        const display = getEl('location-display');
        btn.innerHTML = '🛰️'; btn.classList.add('animate-pulse');
        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                display.textContent = `📍 Locked: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                display.dataset.location = JSON.stringify({ latitude, longitude });
                btn.innerHTML = '✅'; btn.classList.remove('animate-pulse');
            },
            () => { display.textContent = '❌ GPS Error'; btn.innerHTML = '❌'; btn.classList.remove('animate-pulse'); }
        );
    });

    // --- Form Submission ---
    getEl('issue-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerHTML = '<div class="loader mx-auto"></div>';

        const fd = new FormData();
        fd.append('name', getEl('name').value); fd.append('email', getEl('email').value);
        fd.append('issueType', getEl('issue-type').value); fd.append('severity', getEl('severity').value);
        fd.append('description', getEl('description').value); fd.append('address', getEl('address').value);
        fd.append('issueImage', getEl('issue-image').files[0]);
        if (getEl('location-display').dataset.location) fd.append('location', getEl('location-display').dataset.location);

        try {
            const res = await fetch(`${API_URL}/api/report`, { method: 'POST', body: fd });
            const data = await res.json();
            if (res.ok) {
                alert(`✅ Success! Ticket ID: ${data.complaintId}`);
                e.target.reset(); getEl('location-display').textContent = '';
            }
        } catch (err) { alert('Upload failed.'); }
        finally { btn.disabled = false; btn.innerHTML = 'Submit Secure Report'; }
    });

    // --- Tracking ---
    getEl('track-btn').addEventListener('click', async () => {
        const id = getEl('complaint-id').value;
        if (!id) return;
        getEl('status-results').innerHTML = '<div class="loader mx-auto my-20"></div>';
        try {
            const res = await fetch(`${API_URL}/api/track/${id}`);
            const data = await res.json();
            if (res.ok) renderTracking(data);
            else getEl('status-results').innerHTML = '<div class="text-center text-red-400 py-20 font-bold">ID not found.</div>';
        } catch (err) { getEl('status-results').innerHTML = '<div class="text-center text-red-400 py-20">Server Error.</div>'; }
    });

    function renderTracking(report) {
        const isInvalid = report.status === 'Invalid';
        const steps = isInvalid ? ['Submitted', 'Rejected'] : ['Submitted', 'In Review', 'Assigned', 'Resolved'];
        const currentIdx = steps.indexOf(report.status);

        getEl('status-results').innerHTML = `
            <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <!-- Timeline -->
                <div class="flex justify-between relative px-2">
                    <div class="absolute top-4 left-0 w-full h-[2px] bg-zinc-900 z-0"></div>
                    ${steps.map((s, i) => `
                        <div class="relative z-10 text-center flex-1">
                            <div class="w-8 h-8 mx-auto rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all 
                                ${i <= currentIdx ? (isInvalid ? 'bg-red-500 border-red-500 text-white' : 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]') : 'bg-zinc-950 border-zinc-800 text-zinc-600'}">
                                ${i < currentIdx ? '✓' : (isInvalid && i === 1 ? '!' : i + 1)}
                            </div>
                            <div class="mt-3 text-[10px] font-bold uppercase tracking-widest ${i <= currentIdx ? 'text-zinc-200' : 'text-zinc-600'}">${s}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="grid md:grid-cols-2 gap-10 items-start">
                    <!-- Image with AI ROI Boxes -->
                    <div class="relative group rounded-[2rem] overflow-hidden border border-zinc-800 bg-zinc-950 aspect-video shadow-2xl">
                        <img src="${API_URL}${report.imagePath}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 pointer-events-none">
                            ${report.aiPrediction?.regions ? report.aiPrediction.regions.map(r => `
                                <div class="absolute border-2 ${r.type === 'pothole' ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'} opacity-90 rounded-sm" 
                                     style="left:${r.x}%; top:${r.y}%; width:${r.w}%; height:${r.h}%;">
                                </div>
                            `).join('') : ''}
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="space-y-8">
                        <div>
                            <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isInvalid ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}">${report.status}</span>
                            <h3 class="text-3xl font-bold tracking-tight mt-2">${report.issueType}</h3>
                        </div>
                        
                        ${report.aiPrediction ? `
                            <div class="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-sm">
                                <div class="flex items-center justify-between mb-4">
                                    <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Vision Analysis</span>
                                    <span class="text-[10px] font-black ${report.aiPrediction.validationMatch ? 'text-emerald-400' : 'text-red-400'} uppercase tracking-tighter bg-zinc-950 px-2 py-0.5 rounded">${report.aiPrediction.validationMatch ? 'Match Verified' : 'Mismatch'}</span>
                                </div>
                                <p class="text-sm text-zinc-400">Detected <span class="text-white font-bold">${report.aiPrediction.prediction}</span> with ${report.aiPrediction.confidence} confidence.</p>
                            </div>
                        ` : ''}

                        <div class="grid grid-cols-2 gap-4 text-xs">
                            <div class="p-4 rounded-xl bg-zinc-900/20 border border-zinc-800"><div class="text-zinc-600 font-bold mb-1">PRIORITY</div><div class="text-zinc-300 font-bold">${report.severity}</div></div>
                            <div class="p-4 rounded-xl bg-zinc-900/20 border border-zinc-800"><div class="text-zinc-600 font-bold mb-1">LOCATION</div><div class="text-zinc-300 font-bold truncate">${report.address}</div></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- CivicBot Enhanced ---
    let botStep = 0; let botData = { severity: 'Medium' };
    getEl('bot-trigger').addEventListener('click', () => { getEl('bot-container').classList.toggle('hidden'); if(!getEl('bot-container').classList.contains('hidden')) getEl('bot-input').focus(); });
    getEl('close-bot').addEventListener('click', () => getEl('bot-container').classList.add('hidden'));
    getEl('bot-upload-trigger').addEventListener('click', () => getEl('bot-file-input').click());

    getEl('bot-file-input').addEventListener('change', (e) => {
        if(e.target.files[0]) addBotMsg(`📸 Image selected: ${e.target.files[0].name}. Click Send to process.`, 'user');
    });

    const addBotMsg = (text, type = 'ai') => {
        const div = document.createElement('div');
        div.className = type === 'ai' ? 'bot-msg-ai' : 'bot-msg-user';
        div.textContent = text;
        getEl('bot-messages').appendChild(div);
        getEl('bot-messages').scrollTop = getEl('bot-messages').scrollHeight;
    };

    const showBotSuggestions = (opts) => {
        const sugg = getEl('bot-suggestions'); sugg.innerHTML = '';
        if(!opts) { sugg.classList.add('hidden'); return; }
        sugg.classList.remove('hidden');
        opts.forEach(o => {
            const b = document.createElement('button'); b.className = 'suggestion-chip'; b.textContent = o;
            b.onclick = () => { getEl('bot-input').value = o; botActions(); };
            sugg.appendChild(b);
        });
    };

    const botActions = async () => {
        const val = getEl('bot-input').value.trim();
        const hasFile = getEl('bot-file-input').files.length > 0;
        
        // Allow step 5 (booking) to proceed if there's a file even if text is empty
        if (!val && botStep !== 4 && !(botStep === 5 && hasFile)) return;
        if (val && botStep !== 4) addBotMsg(val, 'user');
        getEl('bot-input').value = ''; showBotSuggestions(null);

        switch (botStep) {
            case 0: botData.name = val; addBotMsg(`Hi ${val}! What is your email?`); botStep++; break;
            case 1: botData.email = val; addBotMsg("What issue are you reporting?"); showBotSuggestions(['Road Repair / Pothole', 'Garbage / Sanitation', 'Street Lighting']); botStep++; break;
            case 2: botData.issueType = val; addBotMsg("Can I use your GPS location?"); showBotSuggestions(['Use GPS', 'Enter Manual Address']); botStep++; break;
            case 3: 
                if(val === 'Use GPS') {
                    addBotMsg("🛰️ Syncing GPS...");
                    navigator.geolocation.getCurrentPosition(
                        p => { botData.location = JSON.stringify({latitude: p.coords.latitude, longitude: p.coords.longitude}); botData.address = "GPS Verified Location"; addBotMsg("✅ Location Locked. Description?"); },
                        () => addBotMsg("❌ GPS Failed. Please type address manually.")
                    );
                } else { addBotMsg("Enter address/landmark:"); }
                botStep++; break;
            case 4: botData.description = val || botData.address; addBotMsg("Click 📷 to upload evidence, then click Send."); botStep++; break;
            case 5:
                addBotMsg("🚀 Analyzing with AI...");
                const fd = new FormData();
                fd.append('name', botData.name); fd.append('email', botData.email);
                fd.append('issueType', botData.issueType); fd.append('severity', 'Medium');
                fd.append('description', botData.description); fd.append('address', botData.address || 'Bot Submission');
                if (getEl('bot-file-input').files[0]) fd.append('issueImage', getEl('bot-file-input').files[0]);
                if (botData.location) fd.append('location', botData.location);

                try {
                    const res = await fetch(`${API_URL}/api/report`, { method: 'POST', body: fd });
                    const d = await res.json();
                    if (res.ok) {
                        addBotMsg(`✅ Ticket Booked! ID: ${d.complaintId}`);
                        addBotMsg(`You can track this ticket below.`);
                        // Clear file input for next time
                        getEl('bot-file-input').value = "";
                    }
                } catch { addBotMsg("❌ Error booking ticket."); }
                botStep = 0; break;
        }
    };

    getEl('bot-send').addEventListener('click', botActions);
    getEl('bot-input').addEventListener('keypress', e => e.key === 'Enter' && botActions());
});
