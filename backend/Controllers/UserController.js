const userModel = require("../Models/User");
const Event = require("../Models/Event");
const Booking = require("../Models/Booking");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
require("dotenv").config();
const secretKey = process.env.SECRET_KEY;
const bcrypt = require("bcrypt");

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransport({  // Fixed: createTransport not createTransporter
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
};

// Send OTP email with console fallback
const sendOTPToValidEmail = async (email, otp) => {
    // ALWAYS log OTP to console for development/testing
    console.log('\n========================================');
    console.log('📧 VERIFICATION CODE');
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
            subject: 'Account Verification - EventTix',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: var(--primary);">Account Verification</h2>
                  <p>Hello,</p>
                  <p>Thank you for registering with EventTix. Please verify your account to continue.</p>
                  <p>Your verification code is:</p>
                  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="font-size: 32px; color: var(--primary); margin: 0; letter-spacing: 5px;">${otp}</h1>
                  </div>
                  <p>This code will expire in 10 minutes.</p>
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
const sendOTPEmail = async (email, otp) => {
    // ALWAYS log OTP to console for development/testing
    console.log('\n========================================');
    console.log('🔐 PASSWORD RESET CODE');
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
            subject: 'Password Reset OTP - EventTix',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #8B5CF6;">Password Reset Request</h2>
                  <p>Hello,</p>
                  <p>You have requested to reset your password for your EventTix account.</p>
                  <p>Your verification code is:</p>
                  <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="font-size: 32px; color: #8B5CF6; margin: 0; letter-spacing: 5px;">${otp}</h1>
                  </div>
                  <p>This code will expire in 10 minutes.</p>
                  <p>If you didn't request this password reset, please ignore this email.</p>
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

const UserController = {
    // Fixed registration function
    register: async (req, res) => {
        try {
            const {email, password, name, role = "Standard User"} = req.body;

            // Check if user already exists
            const existingUser = await userModel.findOne({email});
            if (existingUser) {
                return res.status(409).json({message: "User already exists"});
            }

            // Generate a 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create a new unverified user with all required fields
            const newUser = new userModel({
                name,
                email,
                password: hashedPassword,
                role,
                otp,
                otpExpires,
                isVerified: false
            });

            // Save the user in unverified state
            await newUser.save();

            // Send OTP via email (also logs to console automatically)
            await sendOTPToValidEmail(email, otp);

            res.status(201).json({
                message: "Registration initiated. Please verify your email with the OTP sent."
            });
        } catch (error) {
            console.error("Error registering user:", error);
            res.status(500).json({message: "Server error"});
        }
    },

// Simplified verification function
    verifyRegistration: async (req, res) => {
        try {
            const {email, otp} = req.body;

            const user = await userModel.findOne({email});
            if (!user) {
                return res.status(404).json({message: "User not found"});
            }

            if (!user.otp || user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
                return res.status(400).json({message: "Invalid or expired OTP"});
            }

            // Mark user as verified and clear OTP data
            user.isVerified = true;
            user.otp = null;
            user.otpExpires = null;
            await user.save();

            res.status(200).json({message: "Registration completed successfully"});
        } catch (error) {
            console.error("Error verifying registration:", error);
            res.status(500).json({message: "Server error"});
        }
    },
    login: async (req, res) => {
        try {
            const {email, password} = req.body;

            // Find the user by email
            const user = await userModel.findOne({email});
            if (!user) {
                return res.status(404).json({message: "Email not found"});
            }

            // Check if the password is correct
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(405).json({message: "Incorrect password"});
            }

            // Check if user has verified their email
            if (!user.isVerified) {
                // Generate a new OTP and resend it
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

                user.otp = otp;
                user.otpExpires = otpExpires;
                await user.save();

                // Send OTP via email (also logs to console automatically)
                await sendOTPToValidEmail(email, otp);

                return res.status(403).json({
                    message: "Account not verified. A new verification code has been sent to your email.",
                    requiresVerification: true
                });
            }

            // User is verified, proceed with login
            const currentDateTime = new Date();
            const expiresAt = new Date(+currentDateTime + 1800000); // expire in 30 minutes

            // Generate a JWT token
            const token = jwt.sign(
                {user: {userId: user._id, role: user.role}},
                secretKey,
                {
                    expiresIn: 3 * 60 * 60,
                }
            );

            return res
                .cookie("token", token, {
                    expires: expiresAt,
                    httpOnly: true,
                    secure: true,
                    SameSite: "none",
                })
                .status(200)
                .json({message: "Login successful", user});
        } catch (error) {
            console.error("Error logging in:", error);
            res.status(500).json({message: "Server error"});
        }
    },
    logout: async (req, res) => {
        try {
            // Clear the JWT token cookie with the same settings used when creating it
            return res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                })
                .status(200)
                .json({message: "Logged out successfully"});
        } catch (error) {
            console.error("Error during logout:", error);
            res.status(500).json({message: "Server error"});
        }
    },


    forgetPassword: async (req, res) => {
        try {
            const {email} = req.body;

            const user = await userModel.findOne({email});
            if (!user) {
                return res.status(404).json({message: "User not found"});
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 mins

            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();

            // Send OTP via email (also logs to console automatically)
            await sendOTPEmail(email, otp);

            res.status(200).json({message: "OTP sent to your email."});
        } catch (error) {
            console.error("Error sending OTP:", error);
            res.status(500).json({message: "Server error"});
        }
    },

    verifyOtp: async (req, res) => {
        try {
            const {email, otp, newPassword} = req.body;

            const user = await userModel.findOne({email});
            if (!user) {
                return res.status(404).json({message: "User not found"});
            }

            if (!user.otp || user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
                return res.status(400).json({message: "Invalid or expired OTP"});
            }

            user.password = await bcrypt.hash(newPassword, 10);
            user.otp = null;
            user.otpExpires = null;
            await user.save();

            res.status(200).json({message: "Password reset successfully"});
        } catch (error) {
            console.error("Error resetting password:", error);
            res.status(500).json({message: "Server error"});
        }
    },

    // Route alias to match frontend API call
    "verify-otp": async (req, res) => {
        return UserController.verifyOtp(req, res);
    },

    async getAllUsers(req, res) {
        try {

            const users = await userModel.find();
            return res.status(200).json({ success: true, data: users });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Get single user by ID - Admin only
    async getUserById(req, res) {
        try {
            const user = await userModel.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });

            }
            console.log(req.user.id)
            return res.status(200).json({ success: true, data: user });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },

    // Update user role - Admin only
    async updateUserRole(req, res) {
        try {
            const { role } = req.body;

            if (!role) {
                return res.status(400).json({ message: "Role is required" });
            }

            // Validate role is one of the allowed types
            const allowedRoles = ['Standard User', 'Organizer', 'System Admin'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ message: "Invalid role" });
            }

            const user = await userModel.findByIdAndUpdate(
                req.params.id,
                { role },
                { new: true, runValidators: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            return res.status(200).json({
                success: true,
                message: "User role updated successfully",
                data: user
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Server error", error: error.message });
        }
    },


    DeleteUser: async (req, res) => {
        try {
            const deletedUser = await userModel.findByIdAndDelete(req.params.id);

            const response = {
                message: "User deleted successfully",
                details: {
                    id: deletedUser._id,
                    name: deletedUser.name,
                    email: deletedUser.email,
                    role: deletedUser.role
                }
            };

            res.status(200).json(response);

        } catch (error) {
            console.error("Error deleting user:", error);

            // Handle specific errors
            if (error.name === 'CastError') {
                return res.status(400).json({ message: "Invalid user ID format" });
            }

            res.status(500).json({
                message: "Error deleting user",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    GetUserBookings: async (req, res) => {
        try {
            const userId = req.user.userId; // Get the user ID from the request
            console.log("Fetching bookings for user:", userId);

            // Find all bookings created by the user
            const bookings = await Booking.find({"StandardId": userId});

            if (!bookings || bookings.length === 0) {
                return res.status(404).json({
                    message: "No bookings found for this user",
                    suggestions: [
                        "Check if you have made any bookings",
                        "Try exploring available events"
                    ]
                });
            }

            return res.status(200).json({ success: true, data: bookings });

        } catch (error) {
            console.error("Error fetching user bookings:", error);
            res.status(500).json({
                message: "Error fetching bookings",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    GetOrganizerEvents: async (req, res) => {
        try {
            const organizerId = req.user.userId; // Get the organizer's ID from the request

            // Fetch all events created by the organizer
            const events = await Event.find({ organizerId })
                .select('_id title description date location category image ticketPrice totalTickets remainingTickets status');

            if (!events || events.length === 0) {
                return res.status(404).json({
                    message: "No events found for this organizer",
                    suggestions: [
                        "Create your first event to get started",
                        "Check your event filters if you expected to see events"
                    ]
                });
            }

            // Return the events
            res.status(200).json({
                count: events.length,
                events: events.map(event => ({
                    id: event._id,
                    title: event.title,
                    description: event.description,
                    date: event.date,
                    location: event.location,
                    category: event.category,
                    image: event.image,
                    ticketPrice: event.ticketPrice,
                    totalTickets: event.totalTickets,
                    remainingTickets: event.remainingTickets,
                    status: event.status
                }))
            });
        } catch (error) {
            console.error("Error fetching organizer events:", error);
            res.status(500).json({
                message: "Error fetching events",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },
    GetOrganizerAnalytics: async (req, res) => {
        try {
            const organizerId = req.user.userId;

            // Validate user role
            if (req.user.role !== 'Organizer') {
                return res.status(403).json({
                    message: "Unauthorized: Only organizers can access analytics"
                });
            }

            // Get all events for this organizer
            const events = await Event.find({  organizerId })
                .select('_id title totalTickets remainingTickets');

            if (!events || events.length === 0) {
                return res.status(404).json({
                    message: "No events found for analytics",
                    suggestions: [
                        "Create events to start generating analytics",
                        "Check back after creating your first event"
                    ]
                });
            }

            // Calculate analytics for each event
            const analytics = await Promise.all(events.map(async event => {
                const bookings = await Booking.find({
                    event: event.id,
                    status: { $ne: 'canceled' }
                });

                const ticketsSold = bookings.reduce((sum, booking) => sum + booking.numberOfTickets, 0);
                const percentageSold = (ticketsSold / event.totalTickets) * 100;

                return {
                    eventId: event._id,
                    eventTitle: event.title,
                    totalTickets: event.totalTickets,
                    ticketsSold: ticketsSold,
                    ticketsAvailable: event.remainingTickets,
                    percentageSold: percentageSold.toFixed(2),
                    revenue: ticketsSold * event.ticketPrice
                };
            }));

            // Calculate overall statistics
            const totalRevenue = analytics.reduce((sum, item) => sum + item.revenue, 0);
            const averageSoldPercentage = analytics.reduce((sum, item) => sum + parseFloat(item.percentageSold), 0) / analytics.length;

            res.status(200).json({
                totalEvents: analytics.length,
                totalRevenue: totalRevenue,
                averageSoldPercentage: averageSoldPercentage.toFixed(2),
                events: analytics.sort((a, b) => b.percentageSold - a.percentageSold)
            });

        } catch (error) {
            console.error("Error fetching organizer analytics:", error);
            res.status(500).json({
                message: "Error fetching analytics",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },  getUserProfile: async (req, res) => {
        try {
            const user = await userModel.findById(req.user.userId)
                .select('-password -__v'); // Exclude sensitive fields

            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            res.status(200).json(user);
        } catch (error) {
            console.error("Error fetching user profile:", error);
            res.status(500).json({
                message: "Error fetching profile",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },


    updateUserProfile: async (req, res) => {
        try {
            const { name, email, profilePicture } = req.body;
            const userId = req.user.userId;

            // Find the user
            const user = await userModel.findById(userId);
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            // Check if email is being updated and if it's already taken by another user
            if (email && email !== user.email) {
                const existingUser = await userModel.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({
                        message: "Email already in use by another account"
                    });
                }
            }

            // Update the fields that are provided in the request
            if (name) user.name = name;
            if (email) user.email = email;
            if (profilePicture) user.profilePicture = profilePicture;

            // Save the updated user
            const updatedUser = await user.save();

            // Prepare the response (excluding sensitive data)
            const userResponse = {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                profilePicture: updatedUser.profilePicture,
                role: updatedUser.role,
                createdAt: updatedUser.createdAt
            };

            res.status(200).json({
                message: "Profile updated successfully",
                user: userResponse
            });

        } catch (error) {
            console.error("Error updating user profile:", error);

            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    message: "Validation error",
                    error: error.message
                });
            }

            res.status(500).json({
                message: "Error updating profile",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },


}


module.exports = UserController;
