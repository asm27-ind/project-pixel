import React from 'react';

export default function Sidebar({ processing, project, activeAlgo, onExecute, onLogout }) {
    const suites = [
        {
            title: 'Image Enhancement',
            algos: ['CONTRAST_STRETCHING', 'HISTOGRAM_EQUALIZATION', 'CLAHE', 'GAMMA_CORRECTION'],
        },
        {
            title: 'Image Restoration',
            algos: ['MEAN_FILTER', 'MEDIAN_FILTER', 'INVERSE_FILTER', 'WIENER_FILTER'],
        },
        {
            title: 'Encoding & Compression',
            algos: ['HUFFMAN_CODING', 'ARITHMETIC_CODING', 'LZW_COMPRESSION'],
        },
    ];

    return (
        <aside className="control-sidebar">
            <div className="brand-section">
                <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--brand-cyan)' }}>Pixel Lab</h1>
                <button onClick={onLogout} className="btn-secondary">Exit Session</button>
            </div>

            {suites.map((suite) => (
                <div key={suite.title} className="suite-category">
                    <h3 className="suite-title">{suite.title}</h3>
                    <div className="algo-list">
                        {suite.algos.map((algo) => (
                            <button
                                key={algo}
                                disabled={processing || !project}
                                className={`algo-btn ${activeAlgo === algo ? 'active' : ''}`}
                                onClick={() => onExecute(algo)}
                            >
                                {algo.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </aside>
    );
}