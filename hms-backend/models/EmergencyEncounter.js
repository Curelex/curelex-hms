const mongoose = require('mongoose');

const emergencyEncounterSchema = new mongoose.Schema({
    patientName: { type: String, required: true },
    age: { type: Number, required: true },
    chiefComplaint: { type: String, required: true },
    vitals: {
        bloodPressure: String,
        heartRate: String,
        temperature: String,
        spO2: String
    },
    triageLevel: {
        type: String,
        enum: ['P1', 'P2', 'P3', 'P4', 'P5'], // P1 Critical -> P5 Non-urgent
        required: true
    },
    status: {
        type: String,
        enum: ['Waiting', 'In Treatment', 'Admitted', 'Discharged'],
        default: 'Waiting'
    },
    allocatedBed: { type: String, default: null }, 
    encounterType: { type: String, default: 'EMERGENCY' },
    encounter_type: { type: String, default: 'EMERGENCY' }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyEncounter', emergencyEncounterSchema);