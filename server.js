const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const dbURI = 'mongodb+srv://user_mgr:Project123@cluster0.b7mshb7.mongodb.net/PlacementPro?retryWrites=true&w=majority';

mongoose.connect(dbURI)
    .then(() => console.log('Connected to Database'))
    .catch((err) => console.log('Connection Error:', err));

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    branch: { type: String, required: true },
    cgpa: { type: Number, required: true },
    backlogs: { type: Number, default: 0 }
});
const Student = mongoose.model('Student', studentSchema);

const driveSchema = new mongoose.Schema({
    companyName: String,
    minCGPA: Number,
    branches: [String],
    date: String
});
const Drive = mongoose.model('Drive', driveSchema);

const referralSchema = new mongoose.Schema({
    company: String,
    role: String,
    alumnusName: String,
    link: String,
    createdAt: { type: Date, default: Date.now } 
});
const Referral = mongoose.model('Referral', referralSchema);

app.post('/api/create-referral', async (req, res) => {
    try {
        const newRef = new Referral(req.body);
        await newRef.save();
        res.status(201).json({ message: "Referral Posted Successfully!" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/get-referrals', async (req, res) => {
    try {
        const refs = await Referral.find().sort({ createdAt: -1 });
        res.json(refs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/create-drive', async (req, res) => {
    try {
        const branches = req.body.branches.split(',').map(b => b.trim());
        const newDrive = new Drive({ ...req.body, branches });
        await newDrive.save();
        res.status(201).json({ message: "Drive Launched Successfully" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/eligible-students', async (req, res) => {
    try {
        const minCGPA = parseFloat(req.query.minCGPA) || 7.0;
        const branchArray = req.query.branches 
            ? req.query.branches.split(',').map(b => b.trim()) 
            : ["CS", "MCA"];

        const eligibleList = await Student.find({
            cgpa: { $gte: minCGPA },
            backlogs: 0,
            branch: { $in: branchArray }
        });
        res.json({ count: eligibleList.length, students: eligibleList });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/register-student', async (req, res) => {
    try {
        const newStudent = new Student(req.body);
        await newStudent.save();
        res.status(201).json({ message: "Registered Successfully" });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: "Email already exists" });
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/student-feed', async (req, res) => {
    try {
        const student = await Student.findOne({ email: req.query.email });
        if (!student) return res.status(404).json({ message: "Student not found" });

        const eligibleDrives = await Drive.find({
            minCGPA: { $lte: student.cgpa },
            branches: student.branch
        });
        res.json({ 
            name: student.name, 
            branch: student.branch, 
            drives: eligibleDrives 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));