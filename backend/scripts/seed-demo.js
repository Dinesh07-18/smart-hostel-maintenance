require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

// Explicit opt-in prevents accidental use against a production database.
if (process.env.NODE_ENV !== "development" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Refusing to seed. Set NODE_ENV=development or ALLOW_DEMO_SEED=true.");
  process.exit(1);
}
if (/prod|production/i.test(process.env.DB_NAME || "")) {
  console.error("Refusing to seed a database whose name indicates production.");
  process.exit(1);
}
const cfg = { host: process.env.DB_HOST || "localhost", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || "smart_hostel_maintenance" };
const password = process.env.DEMO_SEED_PASSWORD || "";
const date = "2026-01-01";

async function main() {
  if (!cfg.user || password.length < 12 || password.length > 128) throw new Error("Configure DB_USER and set DEMO_SEED_PASSWORD to a unique password between 12 and 128 characters.");
  const pool = mysql.createPool(cfg);
  const db = await pool.getConnection();
  const q = async (sql, args = []) => (await db.execute(sql, args))[0];
  try {
    await db.beginTransaction();
    const roleNames = ["STUDENT", "MAINTENANCE_STAFF", "WARDEN", "ADMINISTRATOR"];
    for (const role of roleNames) await q("INSERT INTO roles(role_name,description) VALUES(?,?) ON DUPLICATE KEY UPDATE description=VALUES(description)", [role, `Demo ${role.toLowerCase()} role`]);
    const roleIds = {};
    for (const role of roleNames) roleIds[role] = (await q("SELECT role_id FROM roles WHERE role_name=?", [role]))[0].role_id;

    const hostelDefs = [["North Hostel","DEMO-NORTH","Demo campus North Block","BOYS"],["Central Hostel","DEMO-CENTRAL","Demo campus Central Block","GIRLS"],["South Hostel","DEMO-SOUTH","Demo campus South Block","BOYS"]];
    const hostels = [];
    for (const h of hostelDefs) {
      await q("INSERT INTO hostels(hostel_name,hostel_code,address,hostel_type) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE hostel_name=VALUES(hostel_name),address=VALUES(address),hostel_type=VALUES(hostel_type)", h);
      hostels.push((await q("SELECT hostel_id FROM hostels WHERE hostel_code=?", [h[1]]))[0].hostel_id);
    }
    const rooms = [];
    for (const hostelId of hostels) {
      const pair = [];
      for (const roomNo of ["101","102"]) {
        await q("INSERT INTO rooms(hostel_id,room_number,floor_number,capacity,room_status) VALUES(?,?,1,2,'OCCUPIED') ON DUPLICATE KEY UPDATE capacity=VALUES(capacity)", [hostelId,roomNo]);
        pair.push((await q("SELECT room_id FROM rooms WHERE hostel_id=? AND room_number=?", [hostelId,roomNo]))[0].room_id);
      }
      rooms.push(pair);
    }
    async function user(role, email, name) {
      let found = await q("SELECT u.user_id, r.role_name FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.email=?", [email]);
      if (found.length && found[0].role_name !== role) {
        throw new Error(`Demo account ${email} already exists with a different role.`);
      }
      if (!found.length) {
        const passwordHash = await bcrypt.hash(password, 12);
        found = [{ user_id: (await q("INSERT INTO users(role_id,full_name,email,password_hash,account_status) VALUES(?,?,?,?, 'ACTIVE')", [roleIds[role],name,email,passwordHash])).insertId }];
      }
      return { userId: found[0].user_id, email };
    }
    const admin = await user("ADMINISTRATOR","admin@demo.hostel.test","Demo Administrator");
    const wardens = [];
    for (let i=0;i<3;i++) {
      const u=await user("WARDEN",`warden${i+1}@demo.hostel.test`,`Warden ${i+1}`);
      if (!(await q("SELECT warden_assignment_id FROM warden_assignments WHERE user_id=? AND hostel_id=? AND is_active=1",[u.userId,hostels[i]])).length) await q("INSERT INTO warden_assignments(user_id,hostel_id,start_date,is_active) VALUES(?,?,?,TRUE)",[u.userId,hostels[i],date]);
      wardens.push(u);
    }
    const staffHostel=[0,0,1,1,2], staff=[];
    for(let i=0;i<5;i++){
      const u=await user("MAINTENANCE_STAFF",`staff${i+1}@demo.hostel.test`,`Maintenance Staff ${i+1}`);
      let p=await q("SELECT staff_id FROM maintenance_staff_profiles WHERE user_id=?",[u.userId]);
      if(!p.length) p=[{staff_id:(await q("INSERT INTO maintenance_staff_profiles(user_id,employee_code,employment_type) VALUES(?,?,'FULL_TIME')",[u.userId,`DEMO-EMP-${String(i+1).padStart(3,'0')}`])).insertId}];
      if(!(await q("SELECT staff_hostel_assignment_id FROM staff_hostel_assignments WHERE staff_id=? AND hostel_id=? AND is_active=1",[p[0].staff_id,hostels[staffHostel[i]]])).length) await q("INSERT INTO staff_hostel_assignments(staff_id,hostel_id,start_date,is_active) VALUES(?,?,?,TRUE)",[p[0].staff_id,hostels[staffHostel[i]],date]);
      staff.push(u);
    }
    // Required distribution: Hostel 1 rooms 2+2, Hostel 2 rooms 2+1, Hostel 3 rooms 2+1.
    const allocation=[[0,0],[0,0],[0,1],[0,1],[1,0],[1,0],[1,1],[2,0],[2,0],[2,1]], students=[];
    for(let i=0;i<10;i++){
      const u=await user("STUDENT",`student${i+1}@demo.hostel.test`,`Demo Student ${i+1}`);
      let p=await q("SELECT student_id FROM student_profiles WHERE user_id=?",[u.userId]);
      if(!p.length) p=[{student_id:(await q("INSERT INTO student_profiles(user_id,registration_number,department,course,admission_year) VALUES(?,?,'Computer Science','B.Tech',2024)",[u.userId,`DEMO-REG-${String(i+1).padStart(3,'0')}`])).insertId}];
      const [hi,ri]=allocation[i];
      if(!(await q("SELECT room_history_id FROM student_room_history WHERE student_id=? AND is_active=1",[p[0].student_id])).length) await q("INSERT INTO student_room_history(student_id,hostel_id,room_id,start_date,is_active) VALUES(?,?,?,?,TRUE)",[p[0].student_id,hostels[hi],rooms[hi][ri],`${date} 00:00:00`]);
      students.push({...u,studentId:p[0].student_id,hostelId:hostels[hi],roomId:rooms[hi][ri]});
    }
    const cats=await q("SELECT category_id,category_name FROM complaint_categories WHERE is_active=1");
    const cat=Object.fromEntries(cats.map(x=>[x.category_name,x.category_id]));
    const samples=[
      [0,"Water leaking under bathroom sink","Water drips continuously from the pipe below the bathroom sink and wets the floor.","HIGH","HIGH","SUBMITTED","Plumbing"],
      [1,"Bathroom pipe leakage","There is a steady leak from the washroom plumbing beneath the basin.","HIGH","MEDIUM","SUBMITTED","Plumbing"],
      [2,"Room lights not working","Both ceiling lights stopped working and the room is dark at night.","MEDIUM","HIGH","VERIFIED","Electrical"],
      [3,"Power socket sparking","The wall outlet sparks when a charger is connected. Inspect urgently.","CRITICAL","CRITICAL","IN_PROGRESS","Electrical"],
      [4,"Broken study table","The study table leg is loose and the tabletop is unstable.","LOW","MEDIUM","RESOLVED","Furniture"],
      [5,"Room cleaning required","The common wash area needs housekeeping attention.","MEDIUM","MEDIUM","CLOSED","Cleanliness"],
      [5,"Hostel Wi-Fi disconnecting","The wireless network disconnects every few minutes.","MEDIUM","HIGH","ASSIGNED","Internet Connectivity"],
      [6,"Slow internet connection","Internet is unstable and drops during online classes.","MEDIUM","MEDIUM","VERIFIED","Internet Connectivity"],
      [7,"Wardrobe door hinge broken","The wardrobe door is hanging unevenly because its hinge is loose.","LOW","MEDIUM","SUBMITTED","Furniture"],
      [8,"Low bathroom tap pressure","Water pressure from the bathroom tap is very weak.","LOW","MEDIUM","SUBMITTED","Plumbing"],
      [9,"Ceiling fan making noise","The ceiling fan rattles loudly and needs maintenance.","MEDIUM","MEDIUM","RESOLVED","Electrical"],
      [9,"Bathroom shower drain blocked","Water drains very slowly from the shower area and collects on the bathroom floor.","MEDIUM","HIGH","SUBMITTED","Plumbing"]
    ];
    let added=0;
    for(const [si,title,description,severity,urgency,status,category] of samples){
      const s=students[si]; if(!cat[category]) continue;
      if((await q("SELECT complaint_id FROM complaints WHERE student_id=? AND title=? LIMIT 1",[s.studentId,title])).length) continue;
      const submitted=new Date(Date.now()-(10-si)*86400000), resolved=["RESOLVED","CLOSED"].includes(status)?new Date(submitted.getTime()+3600000):null;
      const result=await q("INSERT INTO complaints(student_id,hostel_id,room_id,category_id,title,description,severity,urgency,status,submitted_at,resolved_at,closed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",[s.studentId,s.hostelId,s.roomId,cat[category],title,description,severity,urgency,status,submitted,resolved,status==="CLOSED"?resolved:null]);
      await q("INSERT INTO complaint_events(complaint_id,performed_by,event_type,previous_status,new_status,remarks) VALUES(?,?,'DEMO_SEED_CREATED',NULL,?,'Development demo record')",[result.insertId,s.userId,status]); added++;
    }
    // Ensure sample work is visible in the staff dashboard and has valid assignment history.
    const assignmentSamples = [
      ["Power socket sparking", 4, 1, 1, "ACTIVE"],
      ["Hostel Wi-Fi disconnecting", 6, 3, 2, "ACTIVE"],
      ["Broken study table", 5, 3, 2, "COMPLETED"],
      ["Room cleaning required", 6, 4, 2, "COMPLETED"],
      ["Ceiling fan making noise", 10, 5, 3, "COMPLETED"]
    ];
    for (const [title, studentNumber, staffNumber, wardenNumber, assignmentStatus] of assignmentSamples) {
      const complaintRows = await q("SELECT c.complaint_id, c.hostel_id, c.status FROM complaints c JOIN student_profiles sp ON sp.student_id=c.student_id JOIN users su ON su.user_id=sp.user_id WHERE su.email=? AND c.title=? LIMIT 1", [`student${studentNumber}@demo.hostel.test`, title]);
      if (!complaintRows.length) continue;
      const complaint = complaintRows[0];
      const staffRows = await q("SELECT msp.staff_id, sha.staff_hostel_assignment_id FROM users u JOIN maintenance_staff_profiles msp ON msp.user_id=u.user_id JOIN staff_hostel_assignments sha ON sha.staff_id=msp.staff_id AND sha.hostel_id=? AND sha.is_active=1 WHERE u.email=? LIMIT 1", [complaint.hostel_id, `staff${staffNumber}@demo.hostel.test`]);
      const wardenRows = await q("SELECT user_id FROM users WHERE email=? LIMIT 1", [`warden${wardenNumber}@demo.hostel.test`]);
      if (!staffRows.length || !wardenRows.length) continue;
      const current = await q("SELECT assignment_id FROM complaint_assignments WHERE complaint_id=? AND assignment_status='ACTIVE'", [complaint.complaint_id]);
      const completed = await q("SELECT assignment_id FROM complaint_assignments WHERE complaint_id=? AND assignment_status='COMPLETED'", [complaint.complaint_id]);
      if (assignmentStatus === "ACTIVE" && !current.length) {
        await q("INSERT INTO complaint_assignments(complaint_id,hostel_id,staff_id,staff_hostel_assignment_id,assigned_by,assignment_status) VALUES(?,?,?,?,?,'ACTIVE')", [complaint.complaint_id, complaint.hostel_id, staffRows[0].staff_id, staffRows[0].staff_hostel_assignment_id, wardenRows[0].user_id]);
      } else if (assignmentStatus === "COMPLETED" && !completed.length) {
        await q("INSERT INTO complaint_assignments(complaint_id,hostel_id,staff_id,staff_hostel_assignment_id,assigned_by,unassigned_at,assignment_status) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP,'COMPLETED')", [complaint.complaint_id, complaint.hostel_id, staffRows[0].staff_id, staffRows[0].staff_hostel_assignment_id, wardenRows[0].user_id]);
      }
    }

    // Keep the demo staff availability flag consistent with active assignments.
    await q(`
      UPDATE maintenance_staff_profiles msp
      JOIN users u ON u.user_id=msp.user_id
      SET msp.availability_status = CASE
        WHEN EXISTS (
          SELECT 1 FROM complaint_assignments ca
          WHERE ca.staff_id=msp.staff_id AND ca.assignment_status='ACTIVE'
        ) THEN 'BUSY'
        ELSE 'AVAILABLE'
      END
      WHERE u.email LIKE 'staff%@demo.hostel.test'
        AND msp.availability_status <> 'UNAVAILABLE'
    `);

    // Queue existing and newly inserted demo complaints for asynchronous indexing.
    const queueTable = await q("SHOW TABLES LIKE 'complaint_embedding_jobs'");
    if (queueTable.length) {
      await q(`INSERT IGNORE INTO complaint_embedding_jobs (complaint_id)
               SELECT c.complaint_id FROM complaints c
               JOIN student_profiles sp ON sp.student_id=c.student_id
               JOIN users u ON u.user_id=sp.user_id
               WHERE u.email LIKE 'student%@demo.hostel.test'`);
    }
    await db.commit();
    console.log(JSON.stringify({message:"Non-destructive demo seed complete",hostels:hostels.length,rooms:rooms.flat().length,students:students.length,wardens:wardens.length,maintenanceStaff:staff.length,administrator:admin.email,complaintDefinitions:samples.length,complaintsInserted:added,embeddingQueueAvailable:!!queueTable.length,demoEmails:[admin.email,...wardens.map(x=>x.email),...staff.map(x=>x.email),...students.map(x=>x.email)]},null,2));
  } catch(e){ await db.rollback(); throw e; }
  finally { db.release(); await pool.end(); }
}
main().catch(e=>{console.error("Demo seed failed:",e.message);process.exitCode=1;});
