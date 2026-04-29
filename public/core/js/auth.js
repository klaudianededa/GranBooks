// ==========================================
// AUTENTICAÇÃO
// ==========================================

// Monitora estado do login
auth.onAuthStateChanged((user) => {
    if (user) {
        loadUserData(user);
    } else {
        navTo('view-login');
    }
});

function loadUserData(user) {
    db.collection('users').doc(user.uid).get().then((doc) => {
        if (doc.exists) {
            currentUserData = doc.data();
            currentUserData.uid = user.uid;
            
            updateUIProfile(currentUserData);
            navTo('view-home');
            
            // Inicia listeners de dados
            if(typeof listenToBooks === 'function') listenToBooks();
            if(typeof listenToInbox === 'function') listenToInbox();
            if(typeof listenToAllWishes === 'function') listenToAllWishes();
        }
    });
}

function updateUIProfile(data) {
    const firstName = data.name.split(' ')[0];
    const elements = {
        'user-first-name': firstName.toUpperCase(),
        'home-avatar': firstName.charAt(0).toUpperCase(),
        'profile-name': data.name,
        'profile-course': data.course,
        'profile-avatar': firstName.charAt(0).toUpperCase()
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if(el) el.innerText = value;
    }
}

function logout() {
    auth.signOut().then(() => location.reload());
}

// Inicializa Listeners de Formulario (será chamado no HTML)
function initAuthForms() {
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            const btn = document.getElementById('btn-login');
            
            btn.innerText = "Entrando...";
            btn.disabled = true;

            auth.signInWithEmailAndPassword(email, pass).catch(err => {
                alert("Erro: " + err.message);
                btn.innerText = "Entrar";
                btn.disabled = false;
            });
        });
    }

    const regForm = document.getElementById('register-form');
    if(regForm) {
        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-pass').value;
            const name = document.getElementById('reg-name').value;
            const course = document.getElementById('reg-course').value;
            const btn = document.getElementById('btn-register');

            btn.innerText = "Criando...";
            btn.disabled = true;

            auth.createUserWithEmailAndPassword(email, pass)
                .then((cred) => {
                    return db.collection('users').doc(cred.user.uid).set({
                        name, course, email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => alert("Conta criada!"))
                .catch(err => {
                    alert("Erro: " + err.message);
                    btn.innerText = "Confirmar Cadastro";
                    btn.disabled = false;
                });
        });
    }
}