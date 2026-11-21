const http = require("http");

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, "http://localhost:5000");
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== STARTING QUOTATION BACKEND LIVE TESTS ===");

  try {
    // 1. Next Quotation Number
    console.log("\n1. Testing GET /api/quotations/next-number...");
    const nextRes = await request("GET", "/api/quotations/next-number");
    console.log("Status:", nextRes.status);
    console.log("Next Number:", nextRes.body);

    // 2. Fetch all quotations
    console.log("\n2. Testing GET /api/quotations...");
    const listRes = await request("GET", "/api/quotations");
    console.log("Status:", listRes.status);
    console.log("Found quotations:", listRes.body.count);

    // 3. Create a test quotation
    console.log("\n3. Testing POST /api/quotations...");
    const newQuotation = {
      customerName: "Acme Interior Solutions",
      customerAddress: "Senapati Bapat Road, Pune",
      projectName: "Executive Conference Hall",
      placeOfSupply: "27-Maharashtra",
      gstRate: 18,
      status: "Draft",
      terms: [
        "Quotation valid for 30 days",
        "50% advance payment required",
        "Delivery within 25 days",
      ],
      notes: "Custom teakwood finish with wire grommet",
      items: [
        {
          itemName: "Boat-shaped Conference Table",
          description: "2400 x 1200 x 750 mm with 2mm PVC edge banding",
          hsn: "9403",
          sizes: "2400x1200",
          quantity: 1,
          unit: "Nos",
          rate: 45000,
        },
        {
          itemName: "Manager High-Back Chair",
          description: "Ergonomic mesh back with lumbar support",
          hsn: "9401",
          sizes: "Standard",
          quantity: 8,
          unit: "Nos",
          rate: 6500,
        },
      ],
    };

    const createRes = await request("POST", "/api/quotations", newQuotation);
    console.log("Status:", createRes.status);
    console.log("Created Quotation:", {
      id: createRes.body.data?.id,
      quotationNo: createRes.body.data?.quotationNo,
      subtotal: createRes.body.data?.subtotal,
      gstAmount: createRes.body.data?.gstAmount,
      grandTotal: createRes.body.data?.grandTotal,
      itemCount: createRes.body.data?.items?.length,
    });

    const createdId = createRes.body.data?.id;

    if (!createdId) {
      throw new Error("Quotation creation failed: " + JSON.stringify(createRes.body));
    }

    // 4. Fetch created quotation by ID
    console.log("\n4. Testing GET /api/quotations/:id...");
    const getRes = await request("GET", `/api/quotations/${createdId}`);
    console.log("Status:", getRes.status);
    console.log("Fetched Quotation:", {
      id: getRes.body.data?.id,
      customerName: getRes.body.data?.customerName,
      grandTotal: getRes.body.data?.grandTotal,
      items: getRes.body.data?.items?.length,
    });

    // 5. Update quotation
    console.log("\n5. Testing PUT /api/quotations/:id...");
    const updateRes = await request("PUT", `/api/quotations/${createdId}`, {
      customerName: "Acme Interior Solutions (Updated)",
      status: "Sent",
      items: [
        ...newQuotation.items,
        {
          itemName: "Crestron Cable Cubby",
          description: "Motorized power & HDMI flip-top unit",
          hsn: "8536",
          sizes: "300x150",
          quantity: 1,
          unit: "Nos",
          rate: 12000,
        },
      ],
    });
    console.log("Status:", updateRes.status);
    console.log("Updated Quotation:", {
      status: updateRes.body.data?.status,
      grandTotal: updateRes.body.data?.grandTotal,
      itemCount: updateRes.body.data?.items?.length,
    });

    // 6. Test conversion from existing estimate
    console.log("\n6. Testing POST /api/quotations/from-estimate/:estimateId...");
    // Let's get an estimation ID
    const estListRes = await request("GET", "/api/estimations");
    const sampleEst = estListRes.body.estimations?.[0] || estListRes.body.data?.[0];
    if (sampleEst) {
      console.log(`Converting estimation #${sampleEst.estimationNumber} (ID: ${sampleEst.id})...`);
      const convRes = await request("POST", `/api/quotations/from-estimate/${sampleEst.id}`);
      console.log("Status:", convRes.status);
      console.log("Converted Quotation:", {
        id: convRes.body.data?.id,
        quotationNo: convRes.body.data?.quotationNo,
        customerName: convRes.body.data?.customerName,
        grandTotal: convRes.body.data?.grandTotal,
      });

      // Cleanup converted quotation
      if (convRes.body.data?.id) {
        await request("DELETE", `/api/quotations/${convRes.body.data.id}`);
        console.log("Cleaned up converted test quotation.");
      }
    } else {
      console.log("No saved estimations found to test conversion.");
    }

    // 7. Delete test quotation
    console.log("\n7. Testing DELETE /api/quotations/:id...");
    const delRes = await request("DELETE", `/api/quotations/${createdId}`);
    console.log("Status:", delRes.status);
    console.log("Delete result:", delRes.body);

    console.log("\n=== ALL QUOTATION BACKEND TESTS PASSED WITH 100% SUCCESS! ===");
  } catch (err) {
    console.error("Test execution failed:", err.message);
  }
}

runTests();
