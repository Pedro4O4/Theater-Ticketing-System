'use client';

import './Loader.css';

interface LoaderProps {
    message?: string;
}

const Loader = ({ message = "Loading..." }: LoaderProps) => {
    return (
        <div className="loader-container">
            <div className="spinner-wrapper">
                <div className="spinner"></div>
                <div className="spinner-inner"></div>
            </div>
            {message && <p className="loading-text">{message}</p>}
        </div>
    );
};

export default Loader;
