// scripts/update-users.ts
import { config } from "dotenv";
import { resolve } from "path";
import admin from "firebase-admin";

// --- 1. โหลด Environment Variables ---
config({ path: resolve(process.cwd(), ".env.local") });

// --- 2. การตั้งค่า ---
const serviceAccountP2 = require("./keys/bim-tracking-firebase-adminsdk-fbsvc-ffc28dd2d6.json");

// --- 3. Initialize App for Project 2 ---
let adminAppP2: admin.app.App;
if (!admin.apps.some((app) => app?.name === "Project2-UserUpdate")) {
  adminAppP2 = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountP2),
  }, "Project2-UserUpdate");
} else {
  adminAppP2 = admin.app("Project2-UserUpdate");
}
const db2 = adminAppP2.firestore();

// --- ข้อมูลผู้ใช้ที่ต้องการอัปเดต ---
const usersData = [
  { employeeId: "100024", fullNameEn: "Issara Ponjarone", role: "BimCoordinate" },
  { employeeId: "100097", fullNameEn: "Rangsan Manosan", role: "BimManager" },
  { employeeId: "100105", fullNameEn: "Watcharapong Wongta", role: "BimCoordinate" },
  { employeeId: "100128", fullNameEn: "Thanaphat Namwong", role: "BimLeader" },
  { employeeId: "100136", fullNameEn: "Ekasith Anburi", role: "BimLeader" },
  { employeeId: "100454", fullNameEn: "Siwaporn Pankhui", role: "BimCoordinate" },
  { employeeId: "100646", fullNameEn: "Sithichocke Nguanchoo", role: "BimLeader" },
  { employeeId: "100769", fullNameEn: "Surasak Singthongla", role: "BimCoordinate" },
  { employeeId: "100884", fullNameEn: "Jutatip Srirat", role: "BimCoordinate" },
  { employeeId: "101020", fullNameEn: "Pattanan Junlamunee", role: "BimCoordinate" },
  { employeeId: "101477", fullNameEn: "Worawut Nawongsa", role: "BimModeler" },
  { employeeId: "101486", fullNameEn: "Onnicha Kamsee", role: "BimModeler" },
  { employeeId: "101508", fullNameEn: "Bussaya Thapanya", role: "BimModeler" },
  { employeeId: "101760", fullNameEn: "Narongsak Buttumpan", role: "BimModeler" },
  { employeeId: "101783", fullNameEn: "Pattarawichaya Chusripetch", role: "BimModeler" },
  { employeeId: "101794", fullNameEn: "Pasakorn Phopumnak", role: "BimModeler" },
  { employeeId: "101795", fullNameEn: "Sutida Srijampa", role: "BimModeler" },
  { employeeId: "101782", fullNameEn: "nattagun talabnak", role: "BimModeler" },
  { employeeId: "101780", fullNameEn: "Thitikorn Bumrungkate", role: "BimModeler" },
];

async function updateUsers() {
  console.log("🚀 Starting to update user data...");

  try {
    const batch = db2.batch();
    let count = 0;

    for (const user of usersData) {
      const { employeeId, fullNameEn, role } = user;
      
      if (!employeeId || !fullNameEn) {
        console.warn(`Skipping user with missing data: ${JSON.stringify(user)}`);
        continue;
      }
      
      // สร้าง Username
      const nameParts = fullNameEn.split(" ");
      const firstName = nameParts[0].toLowerCase();
      const lastNameInitial = nameParts.length > 1 ? nameParts[1].charAt(0).toLowerCase() : "";
      const username = `${firstName}.${lastNameInitial}`;
      
      // เตรียมข้อมูลที่จะอัปเดต
      const userData = {
        employeeId: employeeId,
        fullNameEn: fullNameEn,
        username: username,
        password: employeeId, // ตั้ง Password เป็นรหัสพนักงาน
        role: role,
      };
      
      // ใช้ employeeId เป็น Document ID และใช้ set with merge
      const userRef = db2.collection("users").doc(employeeId);
      batch.set(userRef, userData, { merge: true });
      count++;
    }

    await batch.commit();
    console.log(`✅ Successfully updated ${count} user documents.`);

  } catch (error) {
    console.error("❌ User update failed:", error);
  } finally {
    if (adminAppP2) {
      await adminAppP2.delete();
    }
  }
}

updateUsers();