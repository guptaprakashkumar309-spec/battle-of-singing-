# Google Sheets Integration Guide

Follow this guide to connect your registration form to a Google Sheet so that all participant details are automatically added as rows in real-time.

---

## Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Name the sheet (e.g. `Battle of Singing 2026 Registrations`).
3. Set up the column headers in the first row (A1 to O1):
   - **A1**: `Registration ID`
   - **B1**: `Lead Name`
   - **C1**: `Lead Course`
   - **D1**: `Lead Roll Number`
   - **E1**: `Lead Year`
   - **F1**: `Lead Branch`
   - **G1**: `Category (Solo/Duet)`
   - **H1**: `Partner Name`
   - **I1**: `Partner Course`
   - **J1**: `Partner Roll Number`
   - **K1**: `Partner Year`
   - **L1**: `Partner Branch`
   - **M1**: `Track Original Filename`
   - **N1**: `Track Audio Stream Link`
   - **O1**: `Timestamp`

---

## Step 2: Open Apps Script
1. In the top menu of your Google Sheet, click **Extensions** -> **Apps Script**.
2. Delete any default code in the editor (delete the empty `myFunction` block).
3. Copy and paste the following Google Script code into the editor:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Append rows to the spreadsheet in order matching column headers
    sheet.appendRow([
      data.id,
      data.name,
      data.course,
      data.rollNo,
      data.year,
      data.branch,
      data.participationType,
      data.partnerName,
      data.partnerCourse,
      data.partnerRollNo,
      data.partnerYear,
      data.partnerBranch,
      data.trackOriginalName,
      data.trackPath,
      data.registeredAt
    ]);
    
    // Return a success JSON payload
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const rows = sheet.getDataRange().getValues();
    const data = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      data.push({
        id: row[0],
        name: row[1],
        course: row[2],
        rollNo: row[3],
        year: row[4],
        branch: row[5],
        participationType: row[6],
        partnerName: row[7],
        partnerCourse: row[8],
        partnerRollNo: row[9],
        partnerYear: row[10],
        partnerBranch: row[11],
        trackOriginalName: row[12],
        trackPath: row[13],
        registeredAt: row[14]
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click the **Save** icon (disk floppy icon) at the top of the editor.

---

## Step 3: Deploy as Web App
1. Click the **Deploy** button (blue button at the top right) -> Select **New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Fill in the options:
   - **Description**: `Battle of Singing API Bridge`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: **`Anyone`** *(This is important! Select 'Anyone' so the backend server can send requests without authentication).*
4. Click **Deploy**.
5. Google will ask you to **Authorize Access**. Click **Authorize Access**, log into your Google Account, click **Advanced**, and select **Go to Untitled project (unsafe)** (this is completely safe, it's just warning you about your own custom script). Then click **Allow**.
6. Copy the **Web App URL** generated (it ends with `/exec`).

---

## Step 4: Add the URL to your Server
*   **Locally**: Create a file named `.env` in the project directory, and add the key:
    ```env
    GOOGLE_SHEET_WEBAPP_URL=https://script.google.com/macros/s/YOUR_DEPLOYED_WEB_APP_ID/exec
    PUBLIC_URL=https://c2bd5b0431cf27e2-117-199-105-83.serveousercontent.com
    ```
*   **Publicly (Render.com)**: Add the `GOOGLE_SHEET_WEBAPP_URL` key to your **Environment Variables** in the Render settings page.
