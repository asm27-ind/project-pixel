import React from 'react';

export default function AnalyticsPanel({ project }) {
    const calculateRatio = () => {
        if (!project?.metadata?.compressedSizeInBytes) return 'N/A';
        return (project.metadata.fileSizeInBytes / project.metadata.compressedSizeInBytes).toFixed(2) + ' : 1';
    };

    const calculateSpaceSaved = () => {
        if (!project?.metadata?.compressedSizeInBytes) return '0%';
        const orig = project.metadata.fileSizeInBytes;
        const comp = project.metadata.compressedSizeInBytes;
        return (((orig - comp) / orig) * 100).toFixed(1) + '%';
    };

    return (
        <aside className="analytics-sidebar">
            <div>
                <h2 className="panel-header">Matrix Dimensional Data</h2>
                <div className="metric-card" style={{ marginTop: '10px' }}>
                    <div className="metric-row">
                        <span>Resolution Width</span>
                        <span className="metric-val">{project?.metadata?.width ? `${project.metadata.width} px` : 'N/A'}</span>
                    </div>
                    <div className="metric-row">
                        <span>Resolution Height</span>
                        <span className="metric-val">{project?.metadata?.height ? `${project.metadata.height} px` : 'N/A'}</span>
                    </div>
                    <div className="metric-row">
                        <span>Raw Byte Envelope</span>
                        <span className="metric-val">{project?.metadata?.fileSizeInBytes ? `${(project.metadata.fileSizeInBytes / 1024).toFixed(1)} KB` : 'N/A'}</span>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="panel-header">Execution Profiler</h2>
                <div className="metric-card" style={{ marginTop: '10px' }}>
                    <div className="metric-row">
                        <span>Pipeline Active Technique</span>
                        <span className="metric-val" style={{ color: 'var(--brand-success)' }}>{project?.techniqueApplied || 'NONE'}</span>
                    </div>
                    <div className="metric-row">
                        <span>Python Clock Cycle Runtime</span>
                        <span className="metric-val" style={{ color: '#fbbf24' }}>{project?.metadata?.processingTimeMs ? `${project.metadata.processingTimeMs} ms` : '0.00 ms'}</span>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="panel-header">Compression Analytics</h2>
                <div className="metric-card" style={{ marginTop: '10px' }}>
                    <div className="metric-row">
                        <span>Entropy Code Footprint</span>
                        <span className="metric-val">{project?.metadata?.compressedSizeInBytes ? `${(project.metadata.compressedSizeInBytes / 1024).toFixed(1)} KB` : 'N/A'}</span>
                    </div>
                    <div className="metric-row">
                        <span>Compression Ratio (CR)</span>
                        <span className="metric-val" style={{ color: 'var(--brand-success)' }}>{calculateRatio()}</span>
                    </div>
                    <div className="metric-row">
                        <span>Storage Margin Saved</span>
                        <span className="metric-val" style={{ color: 'var(--brand-cyan)' }}>{calculateSpaceSaved()}</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}