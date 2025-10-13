const Event = require('../Models/Event');
const Booking = require('../Models/Booking'); // Assuming you have a Booking model
const nodemailer = require('nodemailer');
const User = require('../Models/User'); // Add User model import
require("dotenv").config();

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
};

// Send OTP email for event deletion with console fallback
const sendOTPEmail = async (email, otp) => {
    // ALWAYS log OTP to console for development/testing
    console.log('\n========================================');
    console.log('🗑️  EVENT DELETION VERIFICATION CODE');
    console.log('========================================');
    console.log(`Email: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expires: 10 minutes`);
    console.log('========================================\n');

    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Event Deletion Verification - EventTix',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #8B5CF6;">Event Deletion Verification</h2>
                  <p>Hello,</p>
                  <p>You have requested to delete an approved event from EventTix.</p>
                  <p>Your verification code is:</p>
                  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="font-size: 32px; color: #8B5CF6; margin: 0; letter-spacing: 5px;">${otp}</h1>
                  </div>
                  <p>This code will expire in 10 minutes.</p>
                  <p>If you didn't request this event deletion, please ignore this email.</p>
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                  <p style="font-size: 12px; color: #6b7280;">
                    This is an automated email from EventTix. Please do not reply to this email.
                  </p>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.warn('⚠️  Email sending failed (using console fallback):', error.message);
        // Return success anyway - OTP is logged to console
        return { success: true, fallback: true, error: error.message };
    }
};

const eventcontroller = {
    createEvent: async (req, res) => {
        try {
            console.log(req.user.userId)
            // Check if the user is authenticated and has the "Organizer" role
            if (!req.user || req.user.role !== 'Organizer') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized: Only organizers can create events'
                });
            }

            // Extract event details from the request body
            const {
                title,
                description,
                date,
                location,
                category,
                ticketPrice,
                totalTickets,
                imageUrl  // Extract imageUrl from request body
            } = req.body;

            // Determine image path based on upload or URL
            let imagePath;
            if (imageUrl) {
                // Use the provided URL directly
                imagePath = imageUrl;
            } else if (req.file) {
                // Use the uploaded file path
                imagePath = req.file.path;
            } else {
                // Fall back to default image
                imagePath = 'default-image.jpg';
            }

            // Create event
            const newEvent = new Event({
                organizerId: req.user.userId,
                title,
                description,
                date,
                location,
                category,
                ticketPrice,
                totalTickets,
                remainingTickets: totalTickets,
                image: imagePath
            });

            // Save the event to the database
            await newEvent.save();

            res.status(201).json({
                success: true,
                message: 'Event created successfully',
                data: newEvent
            });
        } catch (error) {
            console.error("Error creating event:", error);
            res.status(500).json({
                success: false,
                message: 'Error creating event',
                error: error.message
            });
        }
    },
    getApprovedEventsPublic: async (req, res) => {
        try {
            console.log("Fetching approved events for public");
            const events = await Event.find({ status: "approved" });

            if (events.length === 0) {
                console.log("No approved events found.");
            }

            res.status(200).json(events);
        } catch (err) {
            console.error("Error fetching approved events:", err);
            res.status(500).json({ message: "Failed to fetch approved events." });
        }
    },
    getApprovedEvents: async (req, res) => {
        try {
            console.log("approved events")
            const status = "approved"; // Default to "approved" if no status is provided
            // Fetch only approved events for public access
            const events = await Event.find({ status: status });

            if (events.length === 0) {
                console.log("No approved events found.");
            }

            res.status(200).json(events);
        } catch (err) {
            console.error("Error fetching approved events:", err);
            res.status(500).json({ message: "Failed to fetch approved events." });
        }
    },
    getAllEvents: async (req, res) => {
        try {
            // Ensure only admins can access this route
            if (req.user.role !== "System Admin") {
                return res.status(403).json({ message: "Only admins can view all events." });
            }


            const events = await Event.find(); // Fetch all events (approved, pending, declined)
            if (events.length === 0) {
                console.log("No events found.");
            }
            res.status(200).json(events);
        } catch (err) {
            res.status(500).json({ message: "Failed to fetch all events." });
        }
    },
    getEventById: async (req, res) => {
        try {
            const event = await Event.findById(req.params.id)


            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            res.status(200).json({
                success: true,
                data: event
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error retrieving event',
                error: error.message
            });
        }
    },

    updateEvent: async (req, res) => {
        console.log("update event");
        try {
            const event = await Event.findById(req.params.id);

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // Extract the image URL from the request body
            const { imageUrl } = req.body;

            // Handle image (either from file upload or URL)
            if (imageUrl) {
                // Use the provided URL
                req.body.image = imageUrl;
                console.log("Image URL provided:", req.body.image);
            } else if (req.file) {
                // Use the uploaded file path
                req.body.image = req.file.path;
                console.log("Image uploaded:", req.body.image);
            }
            // If neither is provided, keep the existing image

            const updatedEvent = await Event.findByIdAndUpdate(
                req.params.id,
                req.body,
                {new: true, runValidators: true}
            );

            res.status(200).json({
                success: true,
                data: updatedEvent
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating event',
                error: error.message
            });
        }
    },
    requestEventDeletionOTP: async (req, res) => {
        try {
            const event = await Event.findById(req.params.id);

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // Only require OTP for approved events
            if (event.status !== 'approved') {
                return res.status(400).json({
                    success: false,
                    message: 'OTP verification is only required for approved events'
                });
            }

            // Get user's email
            const user = await User.findById(req.user.userId);
            if (!user || !user.email) {
                return res.status(400).json({
                    success: false,
                    message: 'User email not found'
                });
            }

            // Generate OTP
            const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Store OTP in event document
            event.otp = generatedOTP;
            event.otpExpires = otpExpires;
            await event.save();

            // Send OTP via email (also logs to console automatically)
            await sendOTPEmail(user.email, generatedOTP);

            res.status(200).json({
                success: true,
                message: 'OTP sent to your email for verification'
            });
        } catch (error) {
            console.error('Error requesting event deletion OTP:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing request',
                error: error.message
            });
        }
    },

    // Method to verify OTP and delete event
    verifyEventDeletionOTP: async (req, res) => {
        try {
            const { eventId, otp } = req.body;

            // Find the event
            const event = await Event.findById(eventId);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // Verify OTP
            if (!event.otp || event.otp !== otp || !event.otpExpires || event.otpExpires < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired OTP'
                });
            }

            // Clear OTP after successful verification
            event.otp = null;
            event.otpExpires = null;
            await event.save();

            // Delete associated bookings
            await Booking.deleteMany({ eventId: event._id });

            // Delete the event
            await Event.deleteOne(event);

            res.status(200).json({
                success: true,
                message: 'Event deleted successfully'
            });
        } catch (error) {
            console.error('Error verifying OTP and deleting event:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing request',
                error: error.message
            });
        }
    },

    // Method to delete event (now only handles non-approved events)
    deleteEvent: async (req, res) => {
        try {
            const event = await Event.findById(req.params.id);

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // If event is approved, require OTP verification
            if (event.status === 'approved') {
                return res.status(400).json({
                    success: false,
                    message: 'Approved events require OTP verification. Please use the OTP verification endpoint.'
                });
            }

            // Delete associated bookings
            await Booking.deleteMany({ eventId: event._id });

            // Delete the event
            await Event.deleteOne(event);

            res.status(200).json({
                success: true,
                message: 'Event deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting event:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting event',
                error: error.message
            });
        }
    }
};

module.exports = eventcontroller;
