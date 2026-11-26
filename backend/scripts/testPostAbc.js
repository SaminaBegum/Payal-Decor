async function testPostAbc() {
  const payload = {
    source: "Meta",
    businessName: "abc",
    category: "Hostel",
    genderType: "Boys & Girls",
    primaryPhone: "",
    secondaryEmail: "",
    website: "",
    address: "Pune",
    locality: "Pune",
    mapsUrl: "",
    sourceNote: "",
    sourceUrl: "",
    status: "New",
    notes: "",
    id: `crm-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const res = await fetch("http://localhost:5000/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("POST Status:", res.status);
    const json = await res.json();
    console.log("POST Response:", json);
  } catch (err) {
    console.log("POST ERROR:", err.message);
  }
}

testPostAbc();
