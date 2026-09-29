(function(){
  var STORE_KEY = "turniej_demo_state_v1";

  // ---------- Dane słownikowe ----------
  var SPORTS = [
    {key:"pilka_nozna", label:"Piłka nożna"},
    {key:"siatkowka", label:"Siatkówka"},
    {key:"koszykowka", label:"Koszykówka"},
    {key:"tenis_stolowy", label:"Tenis stołowy"},
    {key:"badminton", label:"Badminton"},
    {key:"pilka_reczna", label:"Piłka ręczna"},
    {key:"inny", label:"Inna dyscyplina"}
  ];
  function sportInfo(key){ return SPORTS.find(function(s){return s.key===key;}) || SPORTS[SPORTS.length-1]; }

  // ---------- Stan aplikacji (localStorage) ----------
  function seed(){
    var t1 = makeTournament(1, "Puchar Osiedla 2026", "pilka_nozna", ["Sokoły","Żubry","Kometa","Wilki","Orlik","Grom"]);
    var t2 = makeTournament(2, "Liga Koszykówki 3x3", "koszykowka", ["Rakiety","Tytani","Falcony","Iskry"]);
    var t3 = makeTournament(3, "Memoriał Siatkarski", "siatkowka", ["Fala","Prąd","Bursztyn","Delfiny","Meduzy"]);
    return {tournaments:[t1,t2,t3], role:"organizer", activeId:1, sportFilter:"all"};
  }

  function load(){
    try{ var raw = localStorage.getItem(STORE_KEY); if(raw) return JSON.parse(raw); }catch(e){}
    return seed();
  }
  function save(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){} }

  // ---------- Logika drabinki (odpowiednik BracketService.cs) ----------
  function nextPow2(n){ var p=1; while(p<n) p*=2; return p; }

  function shuffle(arr){
    var a = arr.slice();
    for(var i=a.length-1;i>0;i--){ var j = Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; }
    return a;
  }

  function makeTournament(id, name, sport, teamNames){
    var size = nextPow2(Math.max(teamNames.length,2));
    var byes = size - teamNames.length;
    // Wolne losy trafiają do RÓŻNYCH meczów (byes < size/2), a kolejność meczów jest losowa.
    var real = shuffle(teamNames.map(function(n){ return {name:n, bye:false}; }));
    var pairs = [], k = 0;
    for(var i=0;i<byes;i++) pairs.push([real[k++], {name:"— (wolny los)", bye:true}]);
    while(k < real.length){ pairs.push([real[k], real[k+1]]); k += 2; }
    pairs = shuffle(pairs);
    var slots = [];
    pairs.forEach(function(p){ if(Math.random() < 0.5) p.reverse(); slots.push(p[0], p[1]); });

    var totalRounds = Math.log2(size);
    var rounds = [];
    for(var r=1;r<=totalRounds;r++){
      var count = size/Math.pow(2,r);
      var matches = [];
      for(var p=0;p<count;p++) matches.push({round:r, pos:p, teamA:null, teamB:null, scoreA:null, scoreB:null, winner:null});
      rounds.push(matches);
    }
    for(var p2=0;p2<rounds[0].length;p2++){
      rounds[0][p2].teamA = slots[p2*2];
      rounds[0][p2].teamB = slots[p2*2+1];
    }
    var t = {id:id, name:name, sport:sport, status:"w_trakcie", rounds:rounds};
    rounds[0].forEach(function(m){ autoAdvanceIfBye(t, m); });
    return t;
  }

  function autoAdvanceIfBye(t, match){
    if(!match.teamA || !match.teamB || match.winner) return;
    if(match.teamA.bye || match.teamB.bye){
      match.winner = match.teamA.bye ? match.teamB : match.teamA;
      advance(t, match);
    }
  }

  function advance(t, match){
    var nextRoundIdx = match.round; // indeks następnej rundy (0-based) = numer bieżącej rundy (1-based)
    if(nextRoundIdx >= t.rounds.length) { checkComplete(t); return; }
    var nextMatch = t.rounds[nextRoundIdx][Math.floor(match.pos/2)];
    if(match.pos % 2 === 0) nextMatch.teamA = match.winner; else nextMatch.teamB = match.winner;
    autoAdvanceIfBye(t, nextMatch);
    checkComplete(t);
  }

  function checkComplete(t){
    var last = t.rounds[t.rounds.length-1];
    t.status = (last.length===1 && last[0].winner) ? "zakonczony" : "w_trakcie";
  }

  function submitResult(t, match, scoreA, scoreB){
    if(scoreA === scoreB){ alert("Remis nie jest dozwolony w fazie pucharowej."); return; }
    match.scoreA = scoreA; match.scoreB = scoreB;
    match.winner = scoreA > scoreB ? match.teamA : match.teamB;
    advance(t, match);
  }

  // ---------- Stan i pomocnicze ----------
  var state = load();
  var currentView = "list";

  function activeTournament(){ return state.tournaments.find(function(x){return x.id===state.activeId;}); }

  function statusLabel(s){ return s==="zakonczony" ? "Zakończony" : (s==="w_trakcie" ? "W trakcie" : "Rejestracja"); }
  function statusTag(s){ return s==="zakonczony" ? "ok" : "warn"; }

  function roundTitle(r, total){
    var fromEnd = total-r;
    if(fromEnd===0) return "Finał";
    if(fromEnd===1) return "Półfinał";
    if(fromEnd===2) return "Ćwierćfinał";
    return "Runda "+r;
  }

  // ---------- Widok: lista turniejów ----------
  function renderList(){
    var wrap = document.getElementById("view-list");
    var html = '<div class="topline"><div><h1>Turnieje</h1><p>Lista założonych turniejów z automatycznie wygenerowaną drabinką pucharową.</p></div>'+
      '<button class="themebtn" id="themeToggle">Zmień motyw</button></div>';

    html += '<div class="sport-filter"><button class="filterchip'+(state.sportFilter==="all"?' active':'')+'" data-filter="all">Wszystkie</button>';
    SPORTS.forEach(function(s){
      html += '<button class="filterchip'+(state.sportFilter===s.key?' active':'')+'" data-filter="'+s.key+'">'+s.label+'</button>';
    });
    html += '</div>';

    var visible = state.tournaments.filter(function(t){ return state.sportFilter==="all" || t.sport===state.sportFilter; });

    html += '<div class="card"><table><thead><tr><th>Nazwa</th><th>Dyscyplina</th><th>Drużyny</th><th>Status</th><th></th></tr></thead><tbody>';
    if(visible.length===0){
      html += '<tr><td colspan="5">Brak turniejów w tej dyscyplinie.</td></tr>';
    }
    visible.forEach(function(t){
      var teamCount = t.rounds[0].reduce(function(n,m){ return n + (m.teamA&&!m.teamA.bye?1:0) + (m.teamB&&!m.teamB.bye?1:0); },0);
      var sp = sportInfo(t.sport);
      html += '<tr><td>'+t.name+'</td><td>'+sp.label+'</td><td>'+teamCount+'</td>'+
        '<td><span class="tag '+statusTag(t.status)+'">'+statusLabel(t.status)+'</span></td>'+
        '<td><button class="smallbtn" data-open="'+t.id+'">Otwórz drabinkę</button></td></tr>';
    });
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
    document.getElementById("themeToggle").onclick = toggleTheme;
    wrap.querySelectorAll('[data-open]').forEach(function(btn){
      btn.onclick = function(){ state.activeId = +btn.getAttribute('data-open'); save(); showView('bracket'); };
    });
    wrap.querySelectorAll('[data-filter]').forEach(function(btn){
      btn.onclick = function(){ state.sportFilter = btn.getAttribute('data-filter'); save(); renderList(); };
    });
  }

  // ---------- Widok: nowy turniej ----------
  function renderCreate(){
    var wrap = document.getElementById("view-create");
    var html = '<div class="topline"><div><h1>Nowy turniej</h1><p>Podaj drużyny — drabinka pucharowa zostanie wygenerowana automatycznie, z wolnymi losami jeśli trzeba.</p></div></div>';
    html += '<div class="card">'+
      '<div class="field"><label>Nazwa turnieju</label><input id="f-name" placeholder="np. Puchar Wiosny 2027"></div>'+
      '<div class="field"><label>Dyscyplina</label><select id="f-sport">'+
        SPORTS.map(function(s){ return '<option value="'+s.key+'">'+s.label+'</option>'; }).join('')+
      '</select></div>'+
      '<div class="field"><label>Drużyny (min. 2)</label><div id="team-list"></div>'+
      '<button class="smallbtn" id="add-team">+ Dodaj drużynę</button></div>'+
      '<div id="create-error"></div>'+
      '<button class="smallbtn primary" id="submit-tournament">Utwórz turniej i wygeneruj drabinkę</button>'+
      '</div>';
    wrap.innerHTML = html;

    var teamListEl = document.getElementById("team-list");
    var teamValues = ['', '', '', ''];
    function renderTeamInputs(){
      teamListEl.innerHTML = '';
      teamValues.forEach(function(value, i){
        var row = document.createElement('div');
        row.className = 'team-row';
        var inp = document.createElement('input');
        inp.setAttribute('data-idx', i);
        inp.setAttribute('placeholder', 'Drużyna ' + (i+1));
        inp.value = value;
        inp.addEventListener('input', function(){ teamValues[i] = inp.value; });
        row.appendChild(inp);
        teamListEl.appendChild(row);
      });
    }
    renderTeamInputs();
    document.getElementById("add-team").onclick = function(){ teamValues.push(''); renderTeamInputs(); };

    document.getElementById("submit-tournament").onclick = function(){
      var name = document.getElementById("f-name").value.trim();
      var sport = document.getElementById("f-sport").value;
      var names = Array.prototype.map.call(teamListEl.querySelectorAll('input'), function(inp){ return inp.value.trim(); }).filter(Boolean);
      var errEl = document.getElementById("create-error");
      if(!name){ errEl.innerHTML = '<div class="banner"><span>⚠</span><div>Podaj nazwę turnieju.</div></div>'; return; }
      if(names.length < 2){ errEl.innerHTML = '<div class="banner"><span>⚠</span><div>Podaj co najmniej dwie drużyny.</div></div>'; return; }
      var id = Math.max.apply(null, state.tournaments.map(function(t){return t.id;}).concat([0])) + 1;
      var t = makeTournament(id, name, sport, names);
      state.tournaments.push(t);
      state.activeId = id;
      save();
      showView('bracket');
    };
  }

  // ---------- Widok: drabinka ----------
  function renderBracket(){
    var wrap = document.getElementById("view-bracket");
    var t = activeTournament();
    if(!t){ wrap.innerHTML = '<div class="card">Brak wybranego turnieju. Wybierz go z listy „Turnieje”.</div>'; return; }

    var sp = sportInfo(t.sport);
    var html = '<div class="topline"><div><h1>'+t.name+'</h1><p>'+sp.label+' &middot; <span class="tag '+statusTag(t.status)+'">'+statusLabel(t.status)+'</span></p></div></div>';
    html += '<div class="bracket">';
    t.rounds.forEach(function(roundMatches, ri){
      html += '<div class="bracket-round"><div class="round-title">'+roundTitle(ri+1, t.rounds.length)+'</div><div class="bracket-matches">';
      roundMatches.forEach(function(m, mi){
        html += '<div class="matchcard">'+teamRow(m,'A')+teamRow(m,'B');
        if(state.role==="organizer" && m.teamA && m.teamB && !m.winner){
          html += '<div class="score-row"><input type="number" min="0" data-score="A" data-round="'+ri+'" data-idx="'+mi+'" value="0">'+
            '<span>:</span><input type="number" min="0" data-score="B" data-round="'+ri+'" data-idx="'+mi+'" value="0">'+
            '<button class="smallbtn" data-submit-round="'+ri+'" data-submit-idx="'+mi+'">Zatwierdź</button></div>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('[data-submit-round]').forEach(function(btn){
      btn.onclick = function(){
        var ri = +btn.getAttribute('data-submit-round'), mi = +btn.getAttribute('data-submit-idx');
        var a = wrap.querySelector('[data-score="A"][data-round="'+ri+'"][data-idx="'+mi+'"]');
        var b = wrap.querySelector('[data-score="B"][data-round="'+ri+'"][data-idx="'+mi+'"]');
        submitResult(t, t.rounds[ri][mi], +a.value, +b.value);
        save();
        renderBracket();
      };
    });
  }

  function teamRow(m, side){
    var team = side==='A' ? m.teamA : m.teamB;
    var score = side==='A' ? m.scoreA : m.scoreB;
    var isWinner = m.winner && team && m.winner.name === team.name;
    var cls = 'teamrow' + (isWinner?' winner':'') + (!team?' pending':'');
    return '<div class="'+cls+'"><span>'+(team?team.name:'oczekuje…')+'</span>'+(score!==null&&score!==undefined?'<b>'+score+'</b>':'')+'</div>';
  }

  // ---------- Nawigacja i start ----------
  var renderers = {list:renderList, create:renderCreate, bracket:renderBracket};
  function showView(name){
    currentView = name;
    document.querySelectorAll('.view').forEach(function(v){ v.classList.add('hidden'); });
    document.getElementById('view-'+name).classList.remove('hidden');
    document.querySelectorAll('.navbtn').forEach(function(b){ b.classList.toggle('active', b.dataset.view===name); });
    renderers[name]();
  }
  function toggleTheme(){
    var root = document.documentElement;
    var cur = root.getAttribute('data-theme');
    root.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
  }

  document.getElementById('nav').addEventListener('click', function(e){
    var btn = e.target.closest('.navbtn');
    if(btn) showView(btn.dataset.view);
  });
  document.getElementById('roleSelect').value = state.role;
  document.getElementById('roleSelect').addEventListener('change', function(e){
    state.role = e.target.value; save(); renderers[currentView]();
  });

  showView('list');
})();
