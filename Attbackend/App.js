const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Configure CORS
app.use(cors(
  { origin: 'exp://192.168.0.109:8081' }
));

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// PostgreSQL connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Attendancedb',
  password: 'gagan@007',
  port: 5432,
});

// Route to fetch list of students based on classroom
app.get('/api/students', async (req, res) => {
  try {
    const classroom = req.query.classroom; // Note the change here
    let tableName;
    
    // Determine the table based on the selected classroom
    switch(classroom) {
      case "I BCA A":
        tableName = 'i_bca_a';
        break;
      case "I BCA B":
        tableName = 'i_bca_b';
        break;
      case "II BCA A":
        tableName = 'ii_bca_a';
        break;
      case "II BCA B":
      tableName = 'ii_bca_b';
      break;
      case "III BCA A":
        tableName = 'iii_bca_a';
        break;
      case "III BCA B":
        tableName = 'iii_bca_b';
        break;
      // Add cases for other classrooms if needed
      default:
        throw new Error('Invalid classroom');
    }

    // Query to select all students from the determined table
    const query = `SELECT stud_regno FROM ${tableName}`;
    
    // Execute the query
    const { rows } = await pool.query(query);
    
    // Send the list of students as JSON response
    res.json(rows);
  } catch (error) {
    console.error('Error fetching students', error);
    // Send error response if something went wrong
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Route to fetch subjects
app.get('/api/subjects', async (req, res) => {
  try {
    // Query to select all students from the determined table
    const query = `SELECT subject FROM subjects`;
    
    // Execute the query
    const { rows } = await pool.query(query);
    
    // Send the list of students as JSON response
    res.json(rows);
  } catch (error) {
    console.error('Error fetching subjects', error);
    // Send error response if something went wrong
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Route to fetch lecturers
app.get('/api/lecturers', async (req, res) => {
  try {
    // Query to select all lecturers from the determined table
    const query = `SELECT name FROM faculties`;
    
    // Execute the query
    const { rows } = await pool.query(query);
    
    // Send the list of lecturers as JSON response
    res.json(rows);
  } catch (error) {
    console.error('Error fetching lecturers', error);
    // Send error response if something went wrong
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to handle attendance submission
app.post('/api/attendance', async (req, res) => {
  try {
    const { date, classroom, hour, subject, lecturer, absentees } = req.body;
    const day = date.substring(8, 10);
    const month = date.substring(5, 7);
    const year = date.substring(0, 4);
    const shortenedDate = day + '-' + month + '-' + year;
    // Insert attendance data into the database
    const insertQuery = 'INSERT INTO attendancedata (attendance_date, classroom, attendance_hour, subject, lecturer, absentees) VALUES ($1, $2, $3, $4, $5, $6)';
    await pool.query(insertQuery, [shortenedDate, classroom, hour, subject, lecturer, absentees]);

    // Send a success response
    res.status(200).json({ message: 'Attendance submitted successfully' });
  } catch (error) {
    console.error('Error submitting attendance', error);
    // Send error response if something went wrong
    res.status(400).json({ error: error.message || 'Invalid request' });
  }
});

//viewatt
app.get('/api/viewattendance', async (req,res) => {
  try{
    const {date, subject, classroom} = req.query;

    const day = date.substring(8, 10);
    const month = date.substring(5, 7);
    const year = date.substring(0, 4);
    const shortenedDate = day + '-' + month + '-' + year;

    const query= "SELECT attendance_date, subject, array_length(absentees, 1) AS absentees_count, absentees FROM attendancedata WHERE attendance_date = $1 AND subject = $2 AND classroom = $3;";
    const { rows } = await pool.query(query, [shortenedDate, subject, classroom]);

    res.json(rows);
  } catch (error){
    res.status(500).json({ error: 'Internal server error' });
  }
});

//attendancepercentage
app.get('/api/attendancepercentage', async (req, res) => {
  try {
    const { classroom, subject, absentees } = req.query;
    const query = `WITH subject_attendance AS (SELECT COUNT(*) AS total_rows FROM attendancedata WHERE subject = $2 AND classroom = $1), student_absences AS (SELECT COUNT(*) AS absent_count, ARRAY_AGG($3::text) AS absentees, classroom FROM attendancedata WHERE subject = $2 AND classroom = $1 AND $3::text = ANY (absentees) GROUP BY classroom) SELECT COALESCE(student_absences.absentees[1], $3) AS absentee, $2 AS subject, CASE WHEN subject_attendance.total_rows > 0 THEN (100 - (COALESCE(student_absences.absent_count, 0)::float / NULLIF(subject_attendance.total_rows, 0)) * 100) ELSE 100 END AS attendance_percentage FROM subject_attendance LEFT JOIN student_absences ON 1=1;`;
    const { rows } = await pool.query(query, [classroom, subject, absentees]);
    // Adjusting the attendance_percentage to ensure it's 100 if total_rows is 0
    const adjustedRows = rows.map(row => ({
      ...row,
      attendance_percentage: row.attendance_percentage === 0 && row.total_rows === '0' ? 100 : row.attendance_percentage
    }));
    res.json(adjustedRows);
  } catch (error) {
    console.error('Error calculating attendance percentage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/logindata', async (req, res) => {
  const { email, password } = req.query;
  try {
    const query = 'SELECT * FROM faculties WHERE email = $1 AND password = $2';
    const { rows } = await pool.query(query, [email, password]);

    if (rows.length > 0) {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error executing login query:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});