import React from 'react';

export default function AboutPage() {
    return (
        <div className="container mx-auto px-4 py-12 text-white">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        About Event Tickets
                    </h1>
                    <div className="h-1 w-24 bg-purple-500 mx-auto rounded"></div>
                </header>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/10">
                    <p className="text-lg mb-6 leading-relaxed">
                        Welcome to <strong>Event Tickets</strong>, your premier destination for experiencing the magic of live performances.
                        We are dedicated to connecting audiences with the events they love, providing a seamless and secure ticketing experience.
                    </p>

                    <p className="text-lg mb-6 leading-relaxed">
                        Our platform offers an intuitive interface for browsing, booking, and managing tickets for theaters, concerts, and exclusive events.
                        With our state-of-the-art theater seating maps and secure payment processing, you can focus on enjoying the show.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-purple-300">Our Mission</h2>
                    <p className="text-lg leading-relaxed">
                        To bring people together through the power of live entertainment, making it accessible, enjoyable, and memorable for everyone.
                    </p>
                </div>
            </div>
        </div>
    );
}
