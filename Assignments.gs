/**
 * FILE: Assignments.gs
 * Updated: 27/03/2026
 * Core Team: JO, HS, MS, HW
 */

// --- 1. MENU CONFIGURATION ---
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Lidl Tools')
    .addItem('📊 View Recruiter Workload', 'showRecruiterLoad')
    .addSeparator()
    .addItem('Check Next in Line', 'checkNextInLine')
    .addItem('Force Update Assignments', 'manualForceUpdate')
    .addSeparator()
    .addItem('1. Send Weekly Docs to Recruiters', 'sendIndividualUpdates')
    .addItem('2. PREVIEW Master Report (To Me Only)', 'runPreview')
    .addItem('🚀 3. FINALISE & SEND TO STAKEHOLDERS', 'runFinal')
    .addToUi();
}

// --- 2. GLOBAL TEAM CONFIG ---
var ACTIVE_TEAM = ["JO", "HS", "MS", "HW"];
var TEAM_EMAILS = {
  "JO": "josephine.oluyitan@lidl.co.uk", 
  "HS": "haydn.scott@lidl.co.uk",
  "MS": "mahyar.shami@lidl.co.uk", 
  "HW": "harriet.winter@lidl.co.uk"
};
var MASTER_SHEET_URL = "https://docs.google.com/spreadsheets/d/1Ll8XMjZ5PzqtO6vhPWJ3YXxz_f9IaEc6stui4HWusP0/edit";

/**
 * 3. MANUAL ASSIGNMENT TRIGGER (OnEdit)
 */
function installedOnEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;

  if (sheet.getName() !== "Live Vacancies" || (range.getColumn() !== 1 && range.getColumn() !== 5)) return;
  
  if (range.getColumn() === 5) { 
    processRoles(); 
    return; 
  }
  
  var recruiterInitials = range.getValue().toString().trim().toUpperCase();
  var row = range.getRow();
  
  if (TEAM_EMAILS[recruiterInitials]) {
    Utilities.sleep(1000);
    var reqId = sheet.getRange(row, 3).getValue().toString().trim();
    var roleName = sheet.getRange(row, 5).getValue();

    var historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Assignment_History");
    var historyData = historySheet.getDataRange().getValues();
    var assignedIds = historyData.map(function(r) { return r[2].toString().trim(); });

    if (reqId && assignedIds.indexOf(reqId) === -1) {
      MailApp.sendEmail({
        to: TEAM_EMAILS[recruiterInitials],
        subject: "New Vacancy Assigned: " + (roleName || "New Role") + " (" + reqId + ")",
        htmlBody: "<p>Hi " + recruiterInitials + ",</p>" +
                  "<p>You have been assigned a new vacancy manually.</p>" +
                  "<ul><li><b>Req ID:</b> " + reqId + "</li><li><b>Role:</b> " + roleName + "</li></ul>" +
                  "<p>👉 <a href='" + MASTER_SHEET_URL + "'>Open Master Vacancy Sheet</a></p>"
      });
      historySheet.appendRow([recruiterInitials, new Date(), reqId, roleName]);
    }
  }
}

/**
 * 4. AUTOMATED ROUND ROBIN ASSIGNMENT
 */
function processRoles() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var liveSheet = ss.getSheetByName("Live Vacancies");
  var historySheet = ss.getSheetByName("Assignment_History"); 
  
  var lastRow = liveSheet.getLastRow();
  if (lastRow < 3) return;

  var historyData = historySheet.getDataRange().getValues();
  var assignedInHistory = historyData.map(function(r) { return r[2].toString().trim(); });
  
  var props = PropertiesService.getScriptProperties();
  var data = liveSheet.getRange(3, 1, lastRow - 2, 9).getValues();

  data.forEach(function(row, index) {
    var actualRow = index + 3;
    var currentRecruiter = row[0];
    var reqId = row[2].toString().trim();
    var jobTitle = row[4];

    if (!currentRecruiter && reqId && jobTitle && assignedInHistory.indexOf(reqId) === -1) {
      var nextIndex = parseInt(props.getProperty("NEXT_RECRUITER_INDEX") || "0");
      if (nextIndex >= ACTIVE_TEAM.length) { nextIndex = 0; }

      var assignedInitials = ACTIVE_TEAM[nextIndex];
      var timestamp = new Date();
      
      liveSheet.getRange(actualRow, 1).setValue(assignedInitials);
      liveSheet.getRange(actualRow, 12).setValue(timestamp); 

      historySheet.appendRow([assignedInitials, timestamp, reqId, jobTitle]);
      assignedInHistory.push(reqId); 

      nextIndex = (nextIndex + 1) % ACTIVE_TEAM.length;
      props.setProperty("NEXT_RECRUITER_INDEX", nextIndex.toString());

      MailApp.sendEmail({
        to: TEAM_EMAILS[assignedInitials],
        subject: "New Vacancy Assigned: " + reqId + " - " + jobTitle,
        htmlBody: "<p>Hi " + assignedInitials + ",</p><p>A new role has been automatically assigned to you.</p>" +
                  "<ul><li><b>Req ID:</b> " + reqId + "</li><li><b>Role:</b> " + jobTitle + "</li></ul>" +
                  "<p>👉 <a href='" + MASTER_SHEET_URL + "'>Open Master Vacancy Sheet</a></p>"
      });
    }
  });
}

// --- 5. UTILITY TOOLS ---

function manualForceUpdate() { 
  processRoles(); 
  SpreadsheetApp.getUi().alert("Round-robin rotation updated."); 
}

function checkNextInLine() {
  var props = PropertiesService.getScriptProperties();
  var nextIndex = parseInt(props.getProperty("NEXT_RECRUITER_INDEX") || "0");
  if (nextIndex >= ACTIVE_TEAM.length) { nextIndex = 0; }
  SpreadsheetApp.getUi().alert("The next recruiter in line is: " + ACTIVE_TEAM[nextIndex]);
}

function showRecruiterLoad() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Live Vacancies");
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;
  
  var data = sheet.getRange(3, 1, lastRow - 2, 1).getValues();
  var counts = { "JO": 0, "HS": 0, "MS": 0, "HW": 0 };
  
  data.forEach(function(row) {
    var initial = row[0].toString().trim().toUpperCase();
    if (counts.hasOwnProperty(initial)) { counts[initial]++; }
  });
  
  var message = "Current Active Workload:\n\n";
  ACTIVE_TEAM.forEach(function(member) { 
    message += member + ": " + counts[member] + " vacancies\n"; 
  });
  SpreadsheetApp.getUi().alert(message);
}
