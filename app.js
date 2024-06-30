const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Đường dẫn đến thư mục chứa các tệp tĩnh
app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload', upload.single('logFile'), (req, res) => {

    if(req.file==undefined)
        return res.status(400).send('Please upload log file.');

    const filePath = path.join(__dirname, req.file.path);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
        return res.status(500).send('Error reading the file.');
        }

        const parsedLogs = parseLogs(data);
        res.json(parsedLogs);
    });
});

// Endpoint để xử lý yêu cầu lọc logs
app.get('/filter', (req, res) => {
    const filterType = req.query.type;
    if (!filterType) {
      return res.status(400).send('Filter type is required.');
    }
  
    // Đọc và parse lại file log
    const filePath = ''; // Đường dẫn tới file log đã upload, cần lưu lại hoặc truyền tham số
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).send('Error reading the log file.');
      }
  
      const parsedLogs = parseLogs(data);
  
      // Áp dụng bộ lọc dựa trên filterType
      let filteredLogs = [];
      switch (filterType) {
        case 'ALL':
          filteredLogs = parsedLogs;
          break;
        case 'ERROR':
          filteredLogs = parsedLogs.filter(log => log.LogType === 'ERROR');
          break;
        case 'SENT_JSON':
          filteredLogs = parsedLogs.filter(log => log.SentJson);
          break;
        case 'RECEIVED_JSON':
          filteredLogs = parsedLogs.filter(log => log.ReceivedJson);
          break;
        case 'RESUME_JSON':
          filteredLogs = parsedLogs.filter(log => log.ResumeInfoJson);
          break;
        case 'TRANS_JSON':
          filteredLogs = parsedLogs.filter(log => log.TransactionInfoJson);
          break;
        case 'JSON':
          filteredLogs = parsedLogs.filter(log => log.SentJson || log.ReceivedJson || log.ResumeInfoJson || log.TransactionInfoJson);
          break;
        default:
          return res.status(400).send('Invalid filter type.');
      }
  
      res.json(filteredLogs);
    });
  });

function parseLogs(data) {
    const logs = [];
    const logEntries = data.split(/\n(?=\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})/);
    

    logEntries.forEach((entry) => {
        
      const log = {};
      const lines = entry.split('\r\n');
  
        // Extract LogDateTime and LogType
        const dateTimeMatch = lines[0].match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})/);
        if (dateTimeMatch) log.LogDateTime = dateTimeMatch[1];

        // Extract LogType
        const logTypeMatch = lines[0].match(/\|\s+(\w+)\s+\|/);
        if (logTypeMatch) log.LogType = logTypeMatch[1];
        if(lines.length>1)
            log.LogContent = lines[1];
      // Extract SentJson
      const sentJsonMatch = entry.match(/Sent: (.+)/);
      if (sentJsonMatch) {
        try {
          log.SentJson = JSON.parse(sentJsonMatch[1]);
        } catch (e) {
          console.error('Error parsing SentJson:', e);
        }
      }
  
      // Extract ReceivedJson
      const receivedJsonMatch = entry.match(/Received message: (.+)/);
      if (receivedJsonMatch) {
        try {
          log.ReceivedJson = JSON.parse(receivedJsonMatch[1]);
        } catch (e) {
          console.error('Error parsing ReceivedJson:', e);
        }
      }
  
      // Extract ResumeInfoJson
      const resumeInfoJsonMatch = entry.match(/app_data\\resume_info\.json:\r?\n/);
      if (resumeInfoJsonMatch) {
        try {
          //log.ResumeInfoJson = JSON.parse(resumeInfoJsonMatch[1]);
          log.ResumeInfoJson = extractTransactionInfoFromLog(entry)
        } catch (e) {
          console.error('Error parsing ResumeInfoJson:', e);
        }
      }
  

    // Extract TransactionInfoJson
    const transactionInfoJsonMatch = entry.match(/transaction_files\\(\d{14}_\d+_\d+_\d+)\.json:\r?\n/);

    if (transactionInfoJsonMatch) {
        log.TransactionInfoJson = extractTransactionInfoFromLog(entry)
    }
  
      logs.push(log);
    });
  
    return logs;
  }


  function extractTransactionInfoFromLog(logEntry) {
    const startIdx = logEntry.indexOf('{');
    const endIdx = logEntry.lastIndexOf('}') + 1;
    const jsonStr = logEntry.substring(startIdx, endIdx).trim();

    try {
        const jsonObj = JSON.parse(jsonStr);
        return jsonObj;
    } catch (error) {
        //console.error('Lỗi khi phân tích JSON từ log:', error);
        return null;
    }
}

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
