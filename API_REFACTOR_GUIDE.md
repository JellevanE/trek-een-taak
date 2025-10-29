# API Refactoring Guide

Example of how to refactor existing hooks to use the new API utilities.
**This is a guide for future refactoring - NOT currently implemented**

## The New Utilities

```javascript
import { apiFetch, getAuthHeaders } from './utils/api';
```

## Before: Duplicated error handling pattern

```javascript
const oldFetchPattern = (token, onUnauthorized, pushToast) => {
    const headers = { Authorization: `Bearer ${token}` };
    
    fetch('/api/tasks', { headers })
        .then((res) => {
            if (res.ok) return res.json();
            if (res.status === 401) {
                onUnauthorized();
                return null;
            }
            throw new Error(`Failed to fetch: ${res.status}`);
        })
        .then((data) => {
            if (data) {
                // Process data
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            pushToast('Failed to fetch tasks', 'error');
        });
};
```

## After: Using the new API utilities

```javascript
const newFetchPattern = async (token, onUnauthorized, pushToast) => {
    try {
        const data = await apiFetch(
            '/api/tasks',
            { headers: getAuthHeaders(token) },
            onUnauthorized
        );
        // Process data
        return data;
    } catch (error) {
        pushToast('Failed to fetch tasks', 'error');
        throw error; // Re-throw if caller needs to handle it
    }
};
```

## Example: Refactoring useQuests.js

```javascript
export const useQuestsRefactored = ({ token, onUnauthorized, pushToast }) => {
    // ... other code ...
    
    const reloadTasks = useCallback(async () => {
        if (!token) {
            setQuests([]);
            return;
        }
        
        try {
            const data = await apiFetch(
                '/api/tasks',
                { headers: getAuthHeaders(token) },
                onUnauthorized
            );
            
            const payload = data.tasks || data.quests || [];
            setQuests(normalizeQuestList(payload));
            
        } catch (error) {
            // Error already logged in apiFetch
            pushToast('Failed to refresh quests', 'error');
        }
    }, [token, onUnauthorized, pushToast]);
    
    const addTask = useCallback(async (description, priority, taskLevel, campaignId) => {
        const payload = { description, priority, task_level: taskLevel };
        if (campaignId !== null) {
            payload.campaign_id = campaignId;
        }
        
        try {
            const newQuest = await apiFetch(
                '/api/tasks',
                {
                    method: 'POST',
                    headers: getAuthHeaders(token),
                    body: JSON.stringify(payload)
                },
                onUnauthorized
            );
            
            const normalized = normalizeQuest(newQuest);
            setQuests((prev) => [normalized, ...prev]);
            pushToast('Quest added', 'success');
            
        } catch (error) {
            const message = error.message || 'Failed to add quest';
            pushToast(message, 'error');
        }
    }, [token, onUnauthorized, pushToast]);
    
    // ... rest of hook ...
};
```

## Benefits of this approach

1. Less code duplication
2. Consistent error handling
3. Easier to add features (retry, caching, etc.)
4. Better type safety (can add TypeScript later)
5. Centralized place to add logging or analytics

## Migration Strategy

1. Start with one hook (e.g., useCampaigns)
2. Test thoroughly
3. Migrate other hooks one at a time
4. Keep old pattern for complex cases that need custom handling
