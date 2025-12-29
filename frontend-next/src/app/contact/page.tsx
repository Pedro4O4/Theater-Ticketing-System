import React from 'react';

export default function ContactPage() {
    return (
        <div className="container mx-auto px-4 py-12 text-white">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        Contact Us
                    </h1>
                    <div className="h-1 w-24 bg-purple-500 mx-auto rounded"></div>
                </header>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-6 text-purple-300">Get in Touch</h2>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4">
                                <span className="text-2xl">📧</span>
                                <div>
                                    <p className="font-semibold text-gray-300">Email</p>
                                    <a href="mailto:bebonageh68@gmail.com" className="text-purple-400 hover:text-purple-300 transition-colors">bebonageh68@gmail.com</a>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <span className="text-2xl">📱</span>
                                <div>
                                    <p className="font-semibold text-gray-300">Phone</p>
                                    <p className="text-gray-200">01221627432</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <span className="text-2xl">📍</span>
                                <div>
                                    <p className="font-semibold text-gray-300">Address</p>
                                    <p className="text-gray-200">12 st.mary rod al farag Street<br />City, Country</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/5 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                            <p className="mb-4 text-5xl">👋</p>
                            <p className="text-lg">Have a question? We'd love to hear from you!</p>
                            <p className="text-sm mt-2 opacity-70">Support hours: 9am - 5pm EST</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
