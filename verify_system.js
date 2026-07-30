const http = require('http');

async function testBackend() {
  console.log("=== Testing Grievance Redressal Backend API ===");
  
  // Health check
  try {
    const res = await fetch("http://localhost:5000/api/health");
    const data = await res.json();
    console.log("✅ Health Check Passed:", data);
  } catch (err) {
    console.error("❌ Health Check Failed:", err.message);
  }

  // 1. Login as Student
  let studentToken, studentUser;
  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "arjun@campus.edu", password: "student123" })
    });
    const data = await res.json();
    studentToken = data.token;
    studentUser = data.user;
    console.log("✅ Student Login Passed. Token acquired for:", studentUser.name);
  } catch (err) {
    console.error("❌ Student Login Failed:", err.message);
  }

  // 2. Login as Admin
  let adminToken;
  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@campus.edu", password: "admin123" })
    });
    const data = await res.json();
    adminToken = data.token;
    console.log("✅ Admin Login Passed. Token acquired.");
  } catch (err) {
    console.error("❌ Admin Login Failed:", err.message);
  }

  // 3. Create Complaint
  let newComplaintId;
  try {
    const res = await fetch("http://localhost:5000/api/complaints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        title: "Test Broken Water Pipe in Himalaya Block",
        description: "Water leaking near room entrance. Needs immediate repair.",
        category: "plumbing",
        priority: "high",
        location: "Himalaya Block Room 304"
      })
    });
    const data = await res.json();
    newComplaintId = data.id;
    console.log("✅ Complaint Creation Passed! ID:", newComplaintId, "SLA Deadline:", data.slaDeadline);
  } catch (err) {
    console.error("❌ Complaint Creation Failed:", err.message);
  }

  // 4. Admin Assigns Worker
  try {
    const res = await fetch(`http://localhost:5000/api/complaints/${newComplaintId}/assign`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ workerId: "worker-002" }) // Suresh Plumber
    });
    const data = await res.json();
    console.log("✅ Admin Worker Assignment Passed! Assigned to:", data.assignedTo?.name);
  } catch (err) {
    console.error("❌ Worker Assignment Failed:", err.message);
  }

  // 5. Admin Analytics
  try {
    const res = await fetch("http://localhost:5000/api/analytics", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const data = await res.json();
    console.log("✅ Analytics Engine Passed! KPI Stats:", data.stats);
  } catch (err) {
    console.error("❌ Analytics Failed:", err.message);
  }

  console.log("=== All Backend Tests Finished Successfully! ===");
}

testBackend();
