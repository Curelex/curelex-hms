const express = require('express');
const router = express.Router();
const EmergencyEncounter = require('../models/EmergencyEncounter');
const Bed = require('../models/Bed');

// We wrap the router in a function so we can pass the Socket.IO instance into it
module.exports = (io) => {

    // 1. Emergency Patient Intake (Fast Registration)
    router.post('/intake', async (req, res) => {
        try {
            const newEncounter = new EmergencyEncounter(req.body);
            const savedEncounter = await newEncounter.save();

            // Push real-time update to all clients to refresh the priority queue
            if (io) io.emit('emergencyQueueUpdated');

            res.status(201).json(savedEncounter);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // 2. Triage & Priority Queue
    router.get('/queue', async (req, res) => {
        try {
            // Sorts by triageLevel (P1 -> P5), then by creation time (FIFO for the same priority)
            const queue = await EmergencyEncounter.find({ status: 'Waiting' })
                .sort({ triageLevel: 1, createdAt: 1 });
            res.status(200).json(queue);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // 3. Real-time Bed Availability
    router.get('/beds', async (req, res) => {
        try {
            let beds = await Bed.find({ isEmergencyEligible: true });
            if (beds.length === 0) {
                const defaultBeds = [
                  { bedNumber: 'E1', roomNumber: 'ER-1', roomType: 'General Ward', status: 'Available', isEmergencyEligible: true, clinicId: 'default' },
                  { bedNumber: 'E2', roomNumber: 'ER-1', roomType: 'General Ward', status: 'Occupied', isEmergencyEligible: true, clinicId: 'default' },
                  { bedNumber: 'E3', roomNumber: 'ER-2', roomType: 'ICU', status: 'Available', isEmergencyEligible: true, clinicId: 'default' },
                  { bedNumber: 'E4', roomNumber: 'ER-2', roomType: 'ICU', status: 'Under Cleaning', isEmergencyEligible: true, clinicId: 'default' },
                  { bedNumber: 'E5', roomNumber: 'ER-3', roomType: 'Private Room', status: 'Reserved', isEmergencyEligible: true, clinicId: 'default' }
                ];
                await Bed.insertMany(defaultBeds);
                beds = await Bed.find({ isEmergencyEligible: true });
            }
            res.status(200).json(beds);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Update Bed Status (Available, Occupied, Reserved, Under Cleaning)
    router.put('/beds/:id/status', async (req, res) => {
        try {
            await Bed.findByIdAndUpdate(req.params.id, { status: req.body.status });
            // Broadcast bed status change to all terminals
            if (io) io.emit('bedStatusUpdated', { bedId: req.params.id, status: req.body.status });
            res.status(200).json({ message: 'Bed status updated successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    return router;
};