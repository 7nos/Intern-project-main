import React, { useState } from 'react';
import deepSearchService from '../services/deepSearchService';

const DeepSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const searchResults = await deepSearchService.performSearch({
                query: query.trim(),
                history: [],
                sessionId: 'default-session' // Replace with actual session ID
            });
            setResults(searchResults);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="deep-search-container">
            <div className="search-input">
                <input
                    type="text"
                    placeholder="Enter your search query..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button onClick={handleSearch} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {results && (
                <div className="search-results">
                    <h3>Results</h3>
                    <div className="result-content">
                        {results.parts?.[0]?.text && (
                            <div className="answer">
                                <h4>Answer:</h4>
                                <p>{results.parts[0].text}</p>
                            </div>
                        )}
                        {results.metadata?.sources?.length > 0 && (
                            <div className="sources">
                                <h4>Sources:</h4>
                                <ul>
                                    {results.metadata.sources.map((source, index) => (
                                        <li key={index}>
                                            {source.title} - {source.url}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeepSearch;
