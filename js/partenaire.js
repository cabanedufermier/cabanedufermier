/* ====================================================================
   CABANE DU FERMIER — Espace Vendeur & Ambassadeur (Supabase Engine)
   ==================================================================== */

const SUPABASE_URL = 'https://tfsbmtsyegbxijyvxpta.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OAr80mY9z0eXbMh5VxxF-A_ps9xk61R';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // Initialisation icônes Lucide
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Éléments du DOM
    const authSection = document.getElementById('authSection');
    const dashSection = document.getElementById('dashSection');
    const navUserActions = document.getElementById('navUserActions');
    const authAlert = document.getElementById('authAlert');

    // Onglets Auth & OTP
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const otpVerifyForm = document.getElementById('otpVerifyForm');
    const otpEmailTarget = document.getElementById('otpEmailTarget');
    const otpCodeInput = document.getElementById('otpCodeInput');
    const btnResendOtp = document.getElementById('btnResendOtp');

    // Jauge mot de passe & CGU
    const regPassword = document.getElementById('regPassword');
    const pwdMeterFill = document.getElementById('pwdMeterFill');
    const pwdStrengthLabel = document.getElementById('pwdStrengthLabel');
    const btnOpenCgu = document.getElementById('btnOpenCgu');
    const cguModal = document.getElementById('cguModal');
    const btnCloseCguModal = document.getElementById('btnCloseCguModal');
    const btnAcceptCguModal = document.getElementById('btnAcceptCguModal');
    const regCgu = document.getElementById('regCgu');

    // Validation Téléphone Bénin 01
    const regTel = document.getElementById('regTel');
    const regTelHint = document.getElementById('regTelHint');
    const regMomo = document.getElementById('regMomo');
    const regMomoHint = document.getElementById('regMomoHint');

    // Boutons & Modale
    const btnSignOut = document.getElementById('btnSignOut');
    const retraitModal = document.getElementById('retraitModal');
    const btnOpenRetraitModal = document.getElementById('btnOpenRetraitModal');
    const btnCloseRetraitModal = document.getElementById('btnCloseRetraitModal');
    const retraitForm = document.getElementById('retraitForm');

    // Affichage Stats
    const vendeurName = document.getElementById('vendeurName');
    const currentTierRate = document.getElementById('currentTierRate');
    const walletSolde = document.getElementById('walletSolde');
    const monthlyClientsCount = document.getElementById('monthlyClientsCount');
    const totalCommissionsEver = document.getElementById('totalCommissionsEver');
    const progressBarFill = document.getElementById('progressBarFill');
    const tierNextGoal = document.getElementById('tierNextGoal');
    const tier1 = document.getElementById('tier1');
    const tier2 = document.getElementById('tier2');
    const tier3 = document.getElementById('tier3');

    // Partage & QR Code
    const qrcodeContainer = document.getElementById('qrcodeContainer');
    const myPromoCodeDisplay = document.getElementById('myPromoCodeDisplay');
    const btnCopyLink = document.getElementById('btnCopyLink');
    const btnShareWhatsapp = document.getElementById('btnShareWhatsapp');
    const btnDownloadQr = document.getElementById('btnDownloadQr');

    // Tables
    const ordersTableBody = document.getElementById('ordersTableBody');
    const withdrawalsTableBody = document.getElementById('withdrawalsTableBody');

    let currentVendeur = null;
    let qrCodeInstance = null;
    let pendingRegistration = null; // Stocke temporairement les infos à enregistrer post-OTP

    function showAlert(msg, type = 'error') {
        if (!authAlert) return;
        authAlert.textContent = msg;
        authAlert.className = `alert-box alert-${type}`;
        authAlert.style.display = 'block';
    }

    function clearAlert() {
        if (authAlert) authAlert.style.display = 'none';
    }

    // ----- VALIDATION NUMÉRO BÉNIN (+229 01... ou 01...) -----
    function normalizeBeninPhone(phoneStr) {
        // Enlève espaces, tirets, parenthèses
        const clean = phoneStr.replace(/[\s\-\(\)]/g, '');
        // Doit matcher soit +22901xxxxxxxx (14 car), soit 22901xxxxxxxx (13 car), soit 01xxxxxxxx (10 chiffres)
        if (/^(\+?229)?01\d{8}$/.test(clean)) {
            if (clean.startsWith('+229')) return clean;
            if (clean.startsWith('229')) return '+' + clean;
            return '+229' + clean;
        }
        return null;
    }

    function setupPhoneValidation(inputEl, hintEl) {
        if (!inputEl || !hintEl) return;
        inputEl.addEventListener('input', () => {
            const val = inputEl.value.trim();
            if (!val) {
                hintEl.textContent = 'Format exigé : +229 01 XX XX XX XX (10 chiffres béninois avec 01)';
                hintEl.className = 'phone-validation-hint';
                return;
            }
            const normalized = normalizeBeninPhone(val);
            if (normalized) {
                hintEl.textContent = `✓ Numéro valide : ${normalized}`;
                hintEl.className = 'phone-validation-hint valid';
            } else {
                hintEl.textContent = '❌ Le numéro doit obligatoirement commencer par 01 (ex: +229 01 XX XX XX XX)';
                hintEl.className = 'phone-validation-hint invalid';
            }
        });
    }
    setupPhoneValidation(regTel, regTelHint);
    setupPhoneValidation(regMomo, regMomoHint);

    // ----- JAUGE ROBUSTESSE DU MOT DE PASSE -----
    function checkPasswordStrength(pwd) {
        let score = 0;
        if (!pwd) return { score: 0, text: 'Trop court', class: '' };

        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;

        if (score <= 1) return { score: 1, text: 'Faible', class: 'weak' };
        if (score === 2) return { score: 2, text: 'Moyen', class: 'medium' };
        if (score === 3) return { score: 3, text: 'Bon', class: 'good' };
        return { score: 4, text: 'Très Robuste (Sécurisé)', class: 'strong' };
    }

    regPassword?.addEventListener('input', () => {
        const pwd = regPassword.value;
        const res = checkPasswordStrength(pwd);
        if (pwdMeterFill) {
            pwdMeterFill.className = `password-meter-fill ${res.class}`;
        }
        if (pwdStrengthLabel) {
            pwdStrengthLabel.textContent = `Force : ${res.text}`;
            pwdStrengthLabel.style.color = res.score >= 3 ? '#10b981' : (res.score === 2 ? '#f59e0b' : '#ef4444');
        }
    });

    // ----- GESTION MODALE CGU -----
    btnOpenCgu?.addEventListener('click', () => {
        if (cguModal) cguModal.style.display = 'flex';
    });
    btnCloseCguModal?.addEventListener('click', () => {
        if (cguModal) cguModal.style.display = 'none';
    });
    btnAcceptCguModal?.addEventListener('click', () => {
        if (regCgu) regCgu.checked = true;
        if (cguModal) cguModal.style.display = 'none';
    });

    // Gestion des onglets Login / Register
    tabLoginBtn?.addEventListener('click', () => {
        tabLoginBtn.classList.add('active');
        tabRegisterBtn.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        if (otpVerifyForm) otpVerifyForm.style.display = 'none';
        clearAlert();
    });

    tabRegisterBtn?.addEventListener('click', () => {
        tabRegisterBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        if (otpVerifyForm) otpVerifyForm.style.display = 'none';
        clearAlert();
    });

    // ----- 1. CONNEXION -----
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = document.getElementById('btnLoginSubmit');

        btn.disabled = true;
        btn.textContent = 'Connexion en cours...';

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    throw new Error('Votre adresse email n\'a pas encore été validée. Saisissez le code OTP reçu par email.');
                }
                throw error;
            }
            await loadVendeurDashboard(data.user);
        } catch (err) {
            showAlert(err.message || 'Identifiants incorrects.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Se Connecter';
        }
    });

    // ----- 2. INSCRIPTION VENDEUR (AVEC VÉRIFICATION 01, PWD, CGU & ENVOI OTP) -----
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();

        const nom = document.getElementById('regNom').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const rawTel = document.getElementById('regTel').value.trim();
        const codePromo = document.getElementById('regCodePromo').value.trim().toUpperCase();
        const rawMomo = document.getElementById('regMomo').value.trim();
        const reseau = document.getElementById('regMomoReseau').value;
        const password = document.getElementById('regPassword').value;
        const cguAccepted = document.getElementById('regCgu')?.checked;
        const btn = document.getElementById('btnRegisterSubmit');

        // 1. Validation préfixe 01 Bénin
        const tel = normalizeBeninPhone(rawTel);
        if (!tel) {
            showAlert('Numéro WhatsApp invalide : le préfixe béninois 01 est obligatoire (ex: +229 01 XX XX XX XX).');
            return;
        }

        const momo = normalizeBeninPhone(rawMomo);
        if (!momo) {
            showAlert('Numéro Mobile Money invalide : le préfixe béninois 01 est obligatoire (ex: +229 01 XX XX XX XX).');
            return;
        }

        // 2. Validation robustesse mot de passe
        const strength = checkPasswordStrength(password);
        if (strength.score < 2 || password.length < 8) {
            showAlert('Mot de passe trop faible. Il doit contenir au minimum 8 caractères, une majuscule et un chiffre.');
            return;
        }

        // 3. Validation CGU
        if (!cguAccepted) {
            showAlert('Veuillez lire et accepter les Conditions du Programme Ambassadeur.');
            return;
        }

        if (!codePromo.startsWith('CDF-')) {
            showAlert('Votre code promo doit commencer par CDF- (ex: CDF-ALAIN).');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Envoi du code de sécurité...';

        try {
            // Création de l'utilisateur Auth Supabase (envoie l'OTP à l'email)
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password
            });

            if (authError) throw authError;

            // Sauvegarder les données de profil en mémoire et sessionStorage pour insertion post-validation OTP
            pendingRegistration = {
                id: authData.user ? authData.user.id : null,
                email,
                nom,
                tel,
                codePromo,
                momo,
                reseau
            };
            try {
                sessionStorage.setItem('cdf_pending_reg', JSON.stringify(pendingRegistration));
            } catch (e) {}

            // Basculer vers l'écran de validation OTP
            registerForm.style.display = 'none';
            if (otpVerifyForm) {
                otpVerifyForm.style.display = 'block';
                if (otpEmailTarget) otpEmailTarget.textContent = email;
            }
            startResendCountdown(120);
            showAlert('Code de validation envoyé avec succès par email !', 'success');

        } catch (err) {
            showAlert(err.message || 'Erreur lors de la création du compte.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Créer mon compte Ambassadeur';
        }
    });

    // Récupération éventuelle de la session d'inscription en attente
    try {
        const savedReg = sessionStorage.getItem('cdf_pending_reg');
        if (savedReg) pendingRegistration = JSON.parse(savedReg);
    } catch (e) {}

    // ----- 2b. VALIDATION DU CODE OTP EMAIL -----
    otpVerifyForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();

        // Nettoyer le code (enlève tout espace accidentel)
        const token = otpCodeInput?.value.trim().replace(/\s+/g, '');
        if (!token || token.length < 6) {
            showAlert('Veuillez saisir le code complet à 6 chiffres.');
            return;
        }

        const btn = document.getElementById('btnVerifyOtpSubmit');
        btn.disabled = true;
        btn.textContent = 'Vérification...';

        try {
            if (!pendingRegistration) {
                try {
                    const saved = sessionStorage.getItem('cdf_pending_reg');
                    if (saved) pendingRegistration = JSON.parse(saved);
                } catch (e) {}
            }

            const email = (pendingRegistration?.email || document.getElementById('regEmail')?.value || '').trim().toLowerCase();
            if (!email) {
                throw new Error("Adresse email introuvable. Veuillez recommencer l'inscription.");
            }

            // Tentative 1 : type 'signup'
            let verifyResult = await supabaseClient.auth.verifyOtp({
                email,
                token,
                type: 'signup'
            });

            // Tentative 2 : fallback 'email' si Supabase l'a classé comme OTP générique
            if (verifyResult.error) {
                const retryResult = await supabaseClient.auth.verifyOtp({
                    email,
                    token,
                    type: 'email'
                });
                if (!retryResult.error) {
                    verifyResult = retryResult;
                }
            }

            if (verifyResult.error) throw verifyResult.error;

            const data = verifyResult.data;
            const userId = data.user?.id || pendingRegistration?.id;

            // Insérer le profil dans la table vendeurs une fois l'email validé
            if (pendingRegistration && userId) {
                const { error: profileError } = await supabaseClient.from('vendeurs').insert([{
                    id: userId,
                    nom_complet: pendingRegistration.nom,
                    telephone: pendingRegistration.tel,
                    code_promo: pendingRegistration.codePromo,
                    numero_momo: pendingRegistration.momo,
                    reseau_momo: pendingRegistration.reseau,
                    solde_wallet: 0
                }]);

                if (profileError && !profileError.message.includes('duplicate')) {
                    console.warn('Note profil vendeur:', profileError);
                }
            }

            try { sessionStorage.removeItem('cdf_pending_reg'); } catch (e) {}

            showAlert('Email vérifié et compte activé avec succès !', 'success');
            setTimeout(async () => {
                await loadVendeurDashboard(data.user);
            }, 600);

        } catch (err) {
            console.error('Erreur OTP:', err);
            if (err.message && err.message.toLowerCase().includes('expired')) {
                showAlert('Ce code a expiré ou a déjà été utilisé. Cliquez sur "Renvoyer le code" ci-dessous pour en recevoir un tout nouveau.');
            } else {
                showAlert(err.message || 'Code de validation invalide.');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Valider mon compte & Accéder au Dashboard';
        }
    });

    // ----- GESTION COMPTE À REBOURS 2 MINUTES (120s) POUR RENVOI OTP -----
    let resendCountdownTimer = null;

    function startResendCountdown(durationSeconds = 120) {
        if (!btnResendOtp) return;
        if (resendCountdownTimer) clearInterval(resendCountdownTimer);

        let remaining = durationSeconds;
        btnResendOtp.disabled = true;
        btnResendOtp.style.opacity = '0.65';
        btnResendOtp.style.cursor = 'not-allowed';

        const updateBtn = () => {
            const min = Math.floor(remaining / 60);
            const sec = remaining % 60;
            const formatted = min > 0 ? `${min} min ${sec < 10 ? '0' : ''}${sec}s` : `${sec}s`;
            btnResendOtp.textContent = `Renvoyer le code (${formatted})`;
        };

        updateBtn();

        resendCountdownTimer = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(resendCountdownTimer);
                resendCountdownTimer = null;
                btnResendOtp.disabled = false;
                btnResendOtp.style.opacity = '1';
                btnResendOtp.style.cursor = 'pointer';
                btnResendOtp.textContent = 'Renvoyer un nouveau code';
            } else {
                updateBtn();
            }
        }, 1000);
    }

    // Renvoyer l'OTP
    btnResendOtp?.addEventListener('click', async () => {
        if (btnResendOtp.disabled) return;
        clearAlert();

        const email = (pendingRegistration?.email || document.getElementById('regEmail')?.value || '').trim().toLowerCase();
        if (!email) {
            showAlert("Adresse email introuvable pour le renvoi. Veuillez recommencer l'inscription.");
            return;
        }

        btnResendOtp.disabled = true;
        btnResendOtp.textContent = 'Envoi en cours...';

        try {
            const { error } = await supabaseClient.auth.resend({
                type: 'signup',
                email
            });
            if (error) throw error;
            showAlert('Un tout nouveau code de validation a été envoyé dans votre boîte mail !', 'success');
            startResendCountdown(120);
        } catch (err) {
            console.error('Erreur resend:', err);
            if (err.message && err.message.toLowerCase().includes('security purposes')) {
                showAlert('Pour des raisons de sécurité, veuillez patienter avant de redemander un code.');
                startResendCountdown(120);
            } else {
                showAlert(err.message || 'Erreur lors du renvoi du code.');
                btnResendOtp.disabled = false;
                btnResendOtp.textContent = 'Renvoyer un nouveau code';
            }
        }
    });

    // ----- GESTION MOT DE PASSE OUBLIÉ -----
    const linkForgotPassword = document.getElementById('linkForgotPassword');
    const linkBackToLogin = document.getElementById('linkBackToLogin');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const resetEmailTarget = document.getElementById('resetEmailTarget');
    const resetNewPassword = document.getElementById('resetNewPassword');
    const resetPwdMeterFill = document.getElementById('resetPwdMeterFill');
    const resetPwdStrengthLabel = document.getElementById('resetPwdStrengthLabel');

    let resetEmail = '';

    linkForgotPassword?.addEventListener('click', () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        if (otpVerifyForm) otpVerifyForm.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'block';
        clearAlert();
    });

    linkBackToLogin?.addEventListener('click', () => {
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
        if (resetPasswordForm) resetPasswordForm.style.display = 'none';
        loginForm.style.display = 'block';
        clearAlert();
    });

    // Jauge de force pour le nouveau mot de passe
    resetNewPassword?.addEventListener('input', () => {
        const res = checkPasswordStrength(resetNewPassword.value);
        if (resetPwdMeterFill) resetPwdMeterFill.className = `password-meter-fill ${res.class}`;
        if (resetPwdStrengthLabel) {
            resetPwdStrengthLabel.textContent = `Force : ${res.text}`;
            resetPwdStrengthLabel.style.color = res.score >= 3 ? '#10b981' : (res.score === 2 ? '#f59e0b' : '#ef4444');
        }
    });

    // 1. Demande d'envoi du code de réinitialisation
    forgotPasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();
        resetEmail = document.getElementById('forgotEmail')?.value.trim();
        if (!resetEmail) return;

        const btn = document.getElementById('btnForgotSubmit');
        btn.disabled = true;
        btn.textContent = 'Envoi du code...';

        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(resetEmail);
            if (error) throw error;

            forgotPasswordForm.style.display = 'none';
            if (resetPasswordForm) {
                resetPasswordForm.style.display = 'block';
                if (resetEmailTarget) resetEmailTarget.textContent = resetEmail;
            }
            showAlert('Code de réinitialisation envoyé par email !', 'success');
        } catch (err) {
            showAlert(err.message || 'Erreur lors de la demande de réinitialisation.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Envoyer le code de réinitialisation';
        }
    });

    // 2. Validation du code et mise à jour du mot de passe
    resetPasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();

        const token = document.getElementById('resetOtpCode')?.value.trim();
        const newPassword = resetNewPassword?.value;

        if (!token || token.length < 6) {
            showAlert('Veuillez renseigner le code complet à 6 chiffres.');
            return;
        }

        const strength = checkPasswordStrength(newPassword);
        if (strength.score < 2 || newPassword.length < 8) {
            showAlert('Nouveau mot de passe trop faible. Minimum 8 caractères, majuscule et chiffre.');
            return;
        }

        const btn = document.getElementById('btnResetSubmit');
        btn.disabled = true;
        btn.textContent = 'Mise à jour...';

        try {
            // Vérifier le token de réinitialisation
            const { error: otpError } = await supabaseClient.auth.verifyOtp({
                email: resetEmail,
                token,
                type: 'recovery'
            });
            if (otpError) throw otpError;

            // Mettre à jour le mot de passe
            const { error: updateError } = await supabaseClient.auth.updateUser({
                password: newPassword
            });
            if (updateError) throw updateError;

            showAlert('Mot de passe mis à jour avec succès ! Vous pouvez vous connecter.', 'success');
            setTimeout(() => {
                resetPasswordForm.style.display = 'none';
                loginForm.style.display = 'block';
                clearAlert();
            }, 1200);

        } catch (err) {
            showAlert(err.message || 'Code invalide ou expiré.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Mettre à jour mon mot de passe';
        }
    });

    // ----- 3. DÉCONNEXION -----
    btnSignOut?.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.reload();
    });

    // ----- 4. CHARGEMENT DU DASHBOARD & STATS -----
    async function loadVendeurDashboard(user) {
        if (!user) return;

        // Récupérer le profil vendeur
        const { data: profile, error } = await supabaseClient
            .from('vendeurs')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            showAlert("Profil vendeur introuvable.");
            return;
        }

        currentVendeur = profile;

        // Afficher l'interface dashboard
        authSection.style.display = 'none';
        dashSection.style.display = 'block';
        navUserActions.style.display = 'block';

        vendeurName.textContent = profile.nom_complet;
        walletSolde.textContent = `${Number(profile.solde_wallet || 0).toLocaleString('fr-FR')} F`;
        myPromoCodeDisplay.textContent = profile.code_promo;

        // Générer le QR Code pointant vers le site avec ?ref=CODE_PROMO
        generatePartnerQrCode(profile.code_promo);

        // Charger les commandes affiliées
        await loadVendeurOrders(profile.id);

        // Charger les demandes de retrait
        await loadVendeurWithdrawals(profile.id);

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ----- 5. QR CODE & PARTAGE -----
    function generatePartnerQrCode(codePromo) {
        const affiliateUrl = `${window.location.origin}/?ref=${encodeURIComponent(codePromo)}`;
        
        if (qrcodeContainer) {
            qrcodeContainer.innerHTML = '';
            qrCodeInstance = new QRCode(qrcodeContainer, {
                text: affiliateUrl,
                width: 170,
                height: 170,
                colorDark: "#1b4332",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        // Bouton Copier le lien
        btnCopyLink?.addEventListener('click', () => {
            navigator.clipboard.writeText(affiliateUrl).then(() => {
                btnCopyLink.textContent = '✓ Lien copié !';
                setTimeout(() => { btnCopyLink.innerHTML = '<i data-lucide="copy" class="icon-xs"></i> Copier mon lien affilié'; if (typeof lucide !== 'undefined') lucide.createIcons(); }, 2000);
            });
        });

        // Bouton Partager WhatsApp
        btnShareWhatsapp?.addEventListener('click', () => {
            const shareMsg = `Bonjour ! 🌿 Profitez de *5% de réduction* sur vos commandes de poulets fermiers, cailles et viandes fraîches à la Cabane du Fermier avec mon code promo *${codePromo}* !\n\nCommandez directement ici : ${affiliateUrl}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank');
        });

        // Télécharger le QR Code en image PNG
        btnDownloadQr?.addEventListener('click', () => {
            const img = qrcodeContainer.querySelector('img');
            if (img && img.src) {
                const a = document.createElement('a');
                a.href = img.src;
                a.download = `QR-Code-${codePromo}-CabaneDuFermier.png`;
                a.click();
            }
        });
    }

    // ----- 6. CHARGER LES COMMANDES & CALCULER LA GAMIFICATION -----
    async function loadVendeurOrders(vendeurId) {
        const { data: orders, error } = await supabaseClient
            .from('commandes_affiliation')
            .select('*')
            .eq('vendeur_id', vendeurId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur chargement commandes:', error);
            return;
        }

        // Calculs gamification mois courant
        const currentMonth = new Date().toISOString().slice(0, 7); // Ex: '2026-11'
        const monthlyOrders = (orders || []).filter(o => o.created_at && o.created_at.startsWith(currentMonth));
        const clientsCount = monthlyOrders.length;
        monthlyClientsCount.textContent = clientsCount;

        // Total gains cumulés
        let totalCommissions = 0;
        (orders || []).forEach(o => {
            if (o.statut === 'validee') totalCommissions += Number(o.montant_commission || 0);
        });
        totalCommissionsEver.textContent = `${totalCommissions.toLocaleString('fr-FR')} F`;

        // Barème du DAF :
        // 0 à 10 clients => 5%
        // 11 à 30 clients => 7%
        // Plus de 30 clients => 10%
        let currentRate = 5;
        let progressPercent = 0;
        let nextGoalText = '';

        if (clientsCount <= 10) {
            currentRate = 5;
            progressPercent = (clientsCount / 10) * 33;
            nextGoalText = `Plus que ${11 - clientsCount} client(s) pour passer au taux de 7% !`;
            tier1.classList.add('active');
            tier2.classList.remove('active');
            tier3.classList.remove('active');
        } else if (clientsCount <= 30) {
            currentRate = 7;
            progressPercent = 33 + ((clientsCount - 10) / 20) * 33;
            nextGoalText = `Super ! Plus que ${31 - clientsCount} client(s) pour débloquer les 10% !`;
            tier1.classList.remove('active');
            tier2.classList.add('active');
            tier3.classList.remove('active');
        } else {
            currentRate = 10;
            progressPercent = 100;
            nextGoalText = `🏆 Félicitations ! Vous êtes au niveau maximal (10% de commission) !`;
            tier1.classList.remove('active');
            tier2.classList.remove('active');
            tier3.classList.add('active');
        }

        currentTierRate.textContent = `${currentRate}%`;
        progressBarFill.style.width = `${Math.min(100, Math.max(5, progressPercent))}%`;
        tierNextGoal.textContent = nextGoalText;

        // Remplissage du tableau des commandes
        if (orders && orders.length > 0) {
            ordersTableBody.innerHTML = orders.map(o => `
                <tr>
                    <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><strong>${o.client_nom || 'Client'}</strong><br><small style="color:var(--text-muted);">${o.client_tel || ''}</small></td>
                    <td>${Number(o.montant_eligible || 0).toLocaleString('fr-FR')} F</td>
                    <td><strong>${o.taux_commission || 5}%</strong></td>
                    <td style="color: var(--primary); font-weight:700;">+${Number(o.montant_commission || 0).toLocaleString('fr-FR')} F</td>
                    <td><span class="status-badge status-${o.statut}">${o.statut === 'validee' ? 'Validée (Payée)' : (o.statut === 'en_attente' ? 'En cours de livraison' : 'Annulée')}</span></td>
                </tr>
            `).join('');
        } else {
            ordersTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Aucune commande affiliée enregistrée pour l'instant.</td></tr>`;
        }
    }

    // ----- 7. GESTION DES RETRAITS (1 PAR MOIS AVANT LE 15) -----
    async function loadVendeurWithdrawals(vendeurId) {
        const { data: withdrawals, error } = await supabaseClient
            .from('demandes_retrait')
            .select('*')
            .eq('vendeur_id', vendeurId)
            .order('date_demande', { ascending: false });

        if (error) {
            console.error('Erreur retraits:', error);
            return;
        }

        if (withdrawals && withdrawals.length > 0) {
            withdrawalsTableBody.innerHTML = withdrawals.map(w => `
                <tr>
                    <td>${new Date(w.date_demande).toLocaleDateString('fr-FR')}</td>
                    <td><strong>${w.mois_concerne}</strong></td>
                    <td style="font-weight: 700; color: var(--dark);">${Number(w.montant).toLocaleString('fr-FR')} F</td>
                    <td>${w.numero_momo} (${w.reseau_momo})</td>
                    <td><span class="status-badge status-${w.statut}">${w.statut === 'payee' ? 'Viré le ' + new Date(w.date_paiement).toLocaleDateString('fr-FR') : (w.statut === 'en_attente' ? 'En attente (Payable avant le 15)' : 'Rejetée')}</span></td>
                </tr>
            `).join('');
        } else {
            withdrawalsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">Aucun retrait demandé pour l'instant.</td></tr>`;
        }
    }

    // Ouverture Modale Retrait
    btnOpenRetraitModal?.addEventListener('click', () => {
        if (!currentVendeur) return;
        const solde = Number(currentVendeur.solde_wallet || 0);
        document.getElementById('retraitAvailable').value = `${solde.toLocaleString('fr-FR')} F`;
        document.getElementById('retraitMontant').value = solde > 0 ? solde : '';
        document.getElementById('retraitMomoNum').value = currentVendeur.numero_momo || '';
        document.getElementById('retraitReseau').value = currentVendeur.reseau_momo || 'MTN';
        retraitModal.style.display = 'flex';
    });

    btnCloseRetraitModal?.addEventListener('click', () => {
        retraitModal.style.display = 'none';
    });

    // Soumission Retrait
    retraitForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const montant = Number(document.getElementById('retraitMontant').value);
        const momo = document.getElementById('retraitMomoNum').value.trim();
        const reseau = document.getElementById('retraitReseau').value;
        const solde = Number(currentVendeur.solde_wallet || 0);

        // 1. Contrôle Seuil minimum 5 000 FCFA
        const SEUIL_MINIMUM = 5000;
        if (montant < SEUIL_MINIMUM) {
            alert(`Le montant minimum de retrait est de ${SEUIL_MINIMUM.toLocaleString('fr-FR')} FCFA.`);
            return;
        }

        if (montant > solde) {
            alert(`Solde insuffisant. Vous disposez de ${solde.toLocaleString('fr-FR')} FCFA.`);
            return;
        }

        // 2. Contrôle Calendrier DAF (Soumission autorisée entre le 1er et le 5 du mois)
        const today = new Date();
        const dayOfMonth = today.getDate();
        // Permettre le test si besoin mais afficher l'avertissement formel
        if (dayOfMonth > 5 && dayOfMonth < 28) {
            const confirmLate = confirm(`Attention : Conformément aux règles financières, les demandes de retrait doivent être soumises entre le 1er et le 5 du mois pour être virées avant le 15.\n\nNous sommes le ${dayOfMonth} du mois. Souhaitez-vous quand même enregistrer votre demande pour la prochaine session ?`);
            if (!confirmLate) return;
        }

        const currentMonth = new Date().toISOString().slice(0, 7);

        // Vérifier si une demande a déjà été faite ce mois-ci (1 retrait par mois max selon le DAF)
        const { data: existingRequests, error: checkErr } = await supabaseClient
            .from('demandes_retrait')
            .select('id')
            .eq('vendeur_id', currentVendeur.id)
            .eq('mois_concerne', currentMonth);

        if (existingRequests && existingRequests.length > 0) {
            alert('Vous avez déjà effectué votre demande de retrait pour ce mois. Conformément aux règles de gestion, un seul retrait est autorisé par mois.');
            return;
        }

        const btn = document.getElementById('btnSubmitRetrait');
        btn.disabled = true;
        btn.textContent = 'Envoi...';

        try {
            // Insertion de la demande
            const { error: insertErr } = await supabaseClient.from('demandes_retrait').insert([{
                vendeur_id: currentVendeur.id,
                montant,
                numero_momo: momo,
                reseau_momo: reseau,
                mois_concerne: currentMonth,
                statut: 'en_attente'
            }]);

            if (insertErr) throw insertErr;

            // Déduction temporaire du solde
            const newSolde = solde - montant;
            await supabaseClient.from('vendeurs').update({ solde_wallet: newSolde }).eq('id', currentVendeur.id);
            currentVendeur.solde_wallet = newSolde;

            alert('Demande de retrait enregistrée avec succès ! Le virement Mobile Money sera effectué avant le 15 du mois.');
            retraitModal.style.display = 'none';
            await loadVendeurDashboard(currentVendeur);
        } catch (err) {
            alert(err.message || 'Erreur lors de la demande de retrait.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Confirmer';
        }
    });

    // Vérifier si session déjà active
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
        await loadVendeurDashboard(session.user);
    }
});
