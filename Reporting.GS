/**
 * FILE: Reporting.gs
 * Updated: 27/03/2026
 * Core Team: JO, HS, MS, HW 
 * Features: Regional Separation, Duplicate Filtering, and Safe Previews
 */

// --- 1. GLOBAL CONFIGURATION ---
var TEAM_MEMBERS = ["JO", "HS", "MS", "HW"]; 

var RECRUITER_EMAILS = {
  "JO": "josephine.oluyitan@lidl.co.uk", 
  "HS": "haydn.scott@lidl.co.uk",
  "MS": "mahyar.shami@lidl.co.uk", 
  "HW": "harriet.winter@lidl.co.uk"
};

var REGIONAL_LEADS = {
  "NFL": "robert.burling@lidl.co.uk, laura.pound@lidl.co.uk",
  "BEL": "amari.pinnock@lidl.co.uk, jodie.taber@lidl.co.uk, clarisa-catalina.jucan@lidl.co.uk, jessica.wade@lidl.co.uk, lucy.bint@lidl.co.uk",
  "EXE": "declan.norris@lidl.co.uk"
};

var CC_LIST = "haydn.scott@lidl.co.uk, josephine.oluyitan@lidl.co.uk, tina.fitzgerald@lidl.co.uk";
var MASTER_SHEET_URL = "https://docs.google.com/spreadsheets/d/1Ll8XMjZ5PzqtO6vhPWJ3YXxz_f9IaEc6stui4HWusP0/edit";

// --- 2. MENU HELPER FUNCTIONS ---
function runPreview() { consolidateAndSend(true); }
function runFinal() { consolidateAndSend(false); }

/**
 * 3. SEND INDIVIDUAL DOCUMENTS (Friday 9:00 AM)
 */
function sendIndividualUpdates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName("Live Vacancies");
  var lastRow = masterSheet.getLastRow();
  if (lastRow < 3) return;
  
  var data = masterSheet.getRange(3, 1, lastRow - 2, 10).getValues();

  TEAM_MEMBERS.forEach(function(initials) {
    var email = RECRUITER_EMAILS[initials];
    if (!email) return; // Safety check: skip if recruiter removed

    var recruiterRoles = data.filter(function(row) {
      return row[0].toString().trim().toUpperCase() === initials;
    });

    if (recruiterRoles.length > 0) {
      try {
        var folder = getOrCreateFolder("Recruiter Friday Updates");
        var fileName = "Vacancy Update - " + initials + " (" + Utilities.formatDate(new Date(), "GMT", "dd/MM/yyyy") + ")";
        
        var tempSheet = SpreadsheetApp.create(fileName);
        var sheet = tempSheet.getSheets()[0];
        
        sheet.appendRow(["Recruiter", "Region", "Req ID", "Business Unit", "Role Title", "Town", "Current Status", "Interview Date", "NOTES / COMMENTS"]);
        sheet.getRange(1, 1, 1, 9).setBackground("#0050aa").setFontColor("white").setFontWeight("bold");

        recruiterRoles.forEach(function(role) {
          sheet.appendRow([role[0], role[1], role[2], role[3], role[4], role[5], role[6], role[7], ""]);
        });

        var file = DriveApp.getFileById(tempSheet.getId());
        folder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
        file.addEditor(email);

        MailApp.sendEmail({
          to: email,
          subject: "ACTION REQUIRED: Weekly Vacancy Update - " + initials,
          htmlBody: "<p>Hi " + initials + ",</p><p>Please update your roles by 12pm.</p>" +
                    "<p>👉 <b><a href='" + tempSheet.getUrl() + "'>CLICK HERE FOR YOUR UPDATE SHEET</a></b></p>" +
                    "<p>Refer to the <a href='" + MASTER_SHEET_URL + "'>Master Vacancy Sheet</a> if needed.</p>"
        });
      } catch (e) {
        Logger.log("Error sending to " + initials + ": " + e.message);
      }
    }
  });
  SpreadsheetApp.getUi().alert("Friday Documents Sent to the Team.");
}

/**
 * 4. CONSOLIDATE & SEND (Regional Split + Duplicate Proof)
 */
function consolidateAndSend(isPreview) {
  var notesData = { "NFL": {}, "BEL": {}, "EXE": {} };
  var folder = getOrCreateFolder("Recruiter Friday Updates");
  var files = folder.getFiles();
  var todayStr = Utilities.formatDate(new Date(), "GMT", "dd/MM/yyyy");
  var myEmail = "mahyar.shami@lidl.co.uk"; 

  // Collect Data
  while (files.hasNext()) {
    var file = files.next();
    if (file.getName().indexOf(todayStr) > -1) {
      var sheet = SpreadsheetApp.openById(file.getId()).getSheets()[0];
      var data = sheet.getDataRange().getValues();
      
      for (var i = 1; i < data.length; i++) {
        var region = data[i][1];
        var reqId = data[i][2].toString().trim();
        var note = data[i][8] || "No update provided";
        
        if (notesData[region]) {
          // Logic: Keep the note if it exists, overwrite "No update provided" if a duplicate file has a better note
          if (!notesData[region][reqId] || (notesData[region][reqId].note === "No update provided" && note !== "No update provided")) {
            notesData[region][reqId] = {
              title: data[i][4], town: data[i][5], status: data[i][6], note: note
            };
          }
        }
      }
    }
  }

  // Send Regional Emails
  ["NFL", "BEL", "EXE"].forEach(function(region) {
    var regionRoles = notesData[region];
    var ids = Object.keys(regionRoles);
    if (ids.length === 0) return;

    var html = "<h2>Recruitment Update: " + region + " (" + todayStr + ")</h2>" +
               "<table border='1' style='border-collapse: collapse; width: 100%; font-family: Arial;'>" +
               "<tr style='background-color: #0050aa; color: white;'><th>Req ID</th><th>Role</th><th>Town</th><th>Status</th><th>Latest Update</th></tr>";
    
    ids.forEach(function(id) {
      var r = regionRoles[id];
      html += "<tr><td>" + id + "</td><td>" + r.title + "</td><td>" + r.town + "</td><td>" + r.status + "</td><td>" + r.note + "</td></tr>";
    });
    html += "</table>";

    var subject = (isPreview ? "PREVIEW [" + region + "]: " : "Update: ") + "Vacancy Summary - " + region + " (" + todayStr + ")";
    var recipient = isPreview ? myEmail : REGIONAL_LEADS[region];

    MailApp.sendEmail({
      to: recipient,
      cc: isPreview ? "" : CC_LIST,
      subject: subject,
      htmlBody: html
    });
  });

  SpreadsheetApp.getUi().alert(isPreview ? "3 Previews sent to " + myEmail : "Final Regional Reports sent to Stakeholders.");
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
}
