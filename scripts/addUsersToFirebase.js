
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Make sure this file exists in the same directory

// Initialize Firebase Admin SDK
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    console.error("Please ensure 'serviceAccountKey.json' is in the 'scripts' directory and is valid.");
    process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

const usersToAddRaw = [
    // employeeId, firstNameEn, lastNameEn, fullNameTh, role
    ["100024", "Issara", "Ponjarone", "อิสระ พรเจริญ", "BimCoordinate"],
    ["100097", "Rangsan", "Manosan", "รังสรรค์ มาโนสาร", "BimManager"],
    ["100105", "Watcharapong", "Wongta", "วัชรพงษ์ วงศ์ตา", "BimCoordinate"],
    ["100128", "Thanaphat", "Namwong", "ธนภัทร น้ำวงศ์", "BimLeader"],
    ["100136", "Ekasith", "Anburi", "เอกสิทธิ์ อั้นบุรี", "BimLeader"],
    ["100454", "Siwaporn", "Pankhui", "ศิวพร พานขุย", "BimCoordinate"],
    ["100646", "Sithichocke", "Nguanchoo", "สิทธิโชค เงื่อนชู", "BimLeader"],
    ["100769", "Surasak", "Singthongla", "สุรศักดิ์ สิงห์ทองหล้า", "BimCoordinate"],
    ["100884", "Jutatip", "Srirat", "จุฑาทิพย์ ศรีรัตน์", "BimCoordinate"],
    ["101020", "Pattanan", "Junlamunee", "พัฒนันท์ จันทร์ละมุนี", "BimCoordinate"],
    ["101477", "Worawut", "Nawongsa", "วรวุฒิ นาวงษา", "BimModeler"],
    ["101486", "Onnicha", "Kamsee", "อรนิชา คำสี", "BimModeler"],
    ["101508", "Bussaya", "Thapanya", "บุษยา ทาปัญญา", "BimModeler"],
    ["101760", "Narongsak", "Buttumpan", "ณรงค์ศักดิ์ บุญธัมปานนท์", "BimModeler"],
    ["101783", "Pattarawichaya", "Chusripetch", "ภัทรวิชยา ชูศรีเพชร", "BimModeler"],
    ["101794", "Pasakorn", "Phopumnak", "ปาสกร ภพพำนัก", "BimModeler"],
    ["101795", "Sutida", "Srijampa", "สุธิดา ศรีจำปา", "BimModeler"],
    ["101782", "nattagun", "talabnak", "ณัฐกุล ตลับนาค", "BimModeler"],
    ["101780", "Thitikorn", "Bumrungkate", "ฐิติกานต์ บำรุงเกตุ", "BimModeler"],
];

function generateUserData(employeeId, firstNameEn, lastNameEn, fullNameTh, role) {
    const fullNameEn = `${firstNameEn} ${lastNameEn}`;

    // Generate username: first name in lowercase + '.' + first letter of last name in lowercase
    const username = `${firstNameEn.toLowerCase()}.${lastNameEn.toLowerCase()[0]}`;

    // Password is the employeeId
    const password = employeeId;

    return {
        employeeId: employeeId,
        fullNameTh: fullNameTh,
        fullNameEn: fullNameEn,
        user: username,
        password: password, // Storing password in Firestore for simplicity, but for production, avoid storing plaintext passwords.
        role: role // Add the role here
    };
}

async function addUserToFirestoreAndAuth(userData) {
    const employeeId = userData.employeeId;
    const usernameEmail = `${userData.user}@yourproject.com`; // Use a dummy domain for username to act as email for Auth
    const password = userData.password;
    const role = userData.role;

    console.log(`Processing user: ${userData.fullNameEn} (ID: ${employeeId}) with role: ${role}`);

    // 1. Add/Update user in Firestore
    try {
        const docRef = db.collection('Users').doc(employeeId);
        await docRef.set(userData);
        console.log(`Firestore: User '${userData.fullNameEn}' (ID: ${employeeId}) added/updated.`);
    } catch (e) {
        console.error(`Firestore Error for ${userData.fullNameEn}:`, e);
    }

    // 2. Create/Update user in Firebase Authentication and set custom claims
    try {
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(usernameEmail);
            console.log(`Auth: User '${usernameEmail}' already exists. Updating custom claims.`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                userRecord = await auth.createUser({
                    email: usernameEmail,
                    password: password,
                    displayName: userData.fullNameEn,
                    uid: employeeId // Use employeeId as UID for easy linking
                });
                console.log(`Auth: User '${usernameEmail}' created successfully with UID: ${userRecord.uid}`);
            } else {
                throw error; // Re-throw other authentication errors
            }
        }
        await auth.setCustomUserClaims(userRecord.uid, { role: role });
        console.log(`Auth: Custom claim 'role' set to '${role}' for user ${usernameEmail}.`);
    } catch (e) {
        console.error(`Auth Error for user ${usernameEmail}:`, e);
    }
}

async function main() {
    console.log("Starting user data population...");
    for (const [employeeId, firstNameEn, lastNameEn, fullNameTh, role] of usersToAddRaw) {
        const userData = generateUserData(employeeId, firstNameEn, lastNameEn, fullNameTh, role);
        await addUserToFirestoreAndAuth(userData);
    }
    console.log("User data population complete.");
    console.log("\nIMPORTANT: For Firebase Authentication, the 'user' field is used as an email with a dummy domain '@yourproject.com'.");
    console.log("You will need to ensure your frontend login logic uses this format, or adjust the script to use a real domain if you have one.");
    console.log("Also, for production applications, do NOT store plaintext passwords in Firestore as done in this example. Use Firebase Authentication for secure password management.");
    console.log("To access custom claims (like role) in your frontend, you'll need to re-authenticate the user or force a token refresh after claims are set.");
    console.log("For example, after login, you might call 'firebase.auth().currentUser.getIdToken(true)' to get the latest token with claims.");
}

main().catch(console.error);
