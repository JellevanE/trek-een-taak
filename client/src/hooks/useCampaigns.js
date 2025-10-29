import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch, getAuthHeaders as getAuthHeadersUtil } from '../utils/api.js';

export const useCampaigns = ({
    token,
    getAuthHeaders,
    pushToast,
    onUnauthorized,
    reloadTasksRef
}) => {
    const [campaigns, setCampaigns] = useState([]);
    const [campaignSidebarCollapsed, setCampaignSidebarCollapsed] = useState(false);
    const [activeCampaignFilter, setActiveCampaignFilter] = useState(null);
    const [taskCampaignSelection, setTaskCampaignSelection] = useState(null);
    const [campaignFormMode, setCampaignFormMode] = useState(null);
    const [campaignFormValues, setCampaignFormValues] = useState({ name: '', description: '', image_url: '' });
    const [campaignFormBusy, setCampaignFormBusy] = useState(false);
    const [campaignFormError, setCampaignFormError] = useState(null);

    useEffect(() => {
        if (!token) {
            setActiveCampaignFilter(null);
            setTaskCampaignSelection(null);
        }
    }, [token]);

    useEffect(() => {
        if (typeof activeCampaignFilter === 'number') {
            const exists = campaigns.some((campaign) => campaign && campaign.id === activeCampaignFilter);
            if (!exists) {
                setActiveCampaignFilter(null);
            }
        }
    }, [campaigns, activeCampaignFilter]);

    useEffect(() => {
        if (typeof activeCampaignFilter === 'number') {
            setTaskCampaignSelection(activeCampaignFilter);
        } else if (activeCampaignFilter === 'uncategorized') {
            setTaskCampaignSelection(null);
        }
    }, [activeCampaignFilter]);

    const getTasksEndpoint = useCallback((filterValue = activeCampaignFilter) => {
        if (filterValue === null) return '/api/tasks';
        if (filterValue === 'uncategorized') return '/api/tasks?campaign_id=null';
        return `/api/tasks?campaign_id=${encodeURIComponent(filterValue)}`;
    }, [activeCampaignFilter]);

    const refreshCampaigns = useCallback(async () => {
        if (!token) {
            setCampaigns([]);
            return null;
        }
        
        try {
            const data = await apiFetch(
                '/api/campaigns',
                { headers: getAuthHeadersUtil(token) },
                onUnauthorized
            );
            
            if (data && Array.isArray(data.campaigns)) {
                setCampaigns(data.campaigns);
            } else {
                setCampaigns([]);
            }
            return data;
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            setCampaigns([]);
            return null;
        }
    }, [token, onUnauthorized]);

    useEffect(() => {
        refreshCampaigns();
    }, [refreshCampaigns]);

    const openCampaignCreateForm = useCallback(() => {
        setCampaignSidebarCollapsed(false);
        setCampaignFormMode('create');
        setCampaignFormValues({ name: '', description: '', image_url: '' });
        setCampaignFormError(null);
        setCampaignFormBusy(false);
    }, []);

    const campaignLookup = useMemo(() => {
        const map = new Map();
        campaigns.forEach((campaign) => {
            if (campaign && typeof campaign.id === 'number') {
                map.set(campaign.id, campaign);
            }
        });
        return map;
    }, [campaigns]);

    const selectedCampaign = useMemo(() => {
        if (typeof activeCampaignFilter === 'number') {
            return campaignLookup.get(activeCampaignFilter) || null;
        }
        return null;
    }, [activeCampaignFilter, campaignLookup]);

    const openCampaignEditForm = useCallback(() => {
        if (!selectedCampaign) return;
        setCampaignSidebarCollapsed(false);
        setCampaignFormMode('edit');
        setCampaignFormValues({
            name: selectedCampaign.name || '',
            description: selectedCampaign.description || '',
            image_url: selectedCampaign.image_url || ''
        });
        setCampaignFormError(null);
        setCampaignFormBusy(false);
    }, [selectedCampaign]);

    const closeCampaignForm = useCallback(() => {
        setCampaignFormMode(null);
        setCampaignFormError(null);
        setCampaignFormBusy(false);
    }, []);

    const handleCampaignFieldChange = useCallback((field, value) => {
        setCampaignFormValues((prev) => ({ ...prev, [field]: value }));
    }, []);

    useEffect(() => {
        if (campaignFormMode === 'edit') {
            if (selectedCampaign) {
                setCampaignFormValues({
                    name: selectedCampaign.name || '',
                    description: selectedCampaign.description || '',
                    image_url: selectedCampaign.image_url || ''
                });
            } else {
                setCampaignFormMode(null);
                setCampaignFormError(null);
            }
        }
    }, [campaignFormMode, selectedCampaign]);

    const submitCampaignForm = useCallback(async (event) => {
        event.preventDefault();
        if (!campaignFormMode) return;
        const name = (campaignFormValues.name || '').trim();
        if (!name) {
            setCampaignFormError('Campaign name is required');
            return;
        }
        const payload = {
            name,
            description: (campaignFormValues.description || '').trim(),
            image_url: (campaignFormValues.image_url || '').trim()
        };
        if (!payload.description) delete payload.description;
        if (!payload.image_url) payload.image_url = null;

        setCampaignFormBusy(true);
        setCampaignFormError(null);

        if (campaignFormMode === 'create') {
            try {
                const created = await apiFetch(
                    '/api/campaigns',
                    {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(payload)
                    },
                    onUnauthorized
                );
                
                closeCampaignForm();
                pushToast('Campaign created', 'success');
                const reloadTasks = reloadTasksRef.current;
                if (created.id) {
                    setActiveCampaignFilter(created.id);
                    setTaskCampaignSelection(created.id);
                    if (reloadTasks) await reloadTasks(created.id);
                } else if (reloadTasks) {
                    await reloadTasks();
                }
            } catch (error) {
                console.error('Error creating campaign:', error);
                const message = error.message || 'Failed to create campaign';
                setCampaignFormError(message);
            } finally {
                setCampaignFormBusy(false);
            }
        } else if (campaignFormMode === 'edit' && selectedCampaign) {
            try {
                await apiFetch(
                    `/api/campaigns/${selectedCampaign.id}`,
                    {
                        method: 'PATCH',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(payload)
                    },
                    onUnauthorized
                );
                
                closeCampaignForm();
                pushToast('Campaign updated', 'success');
                const reloadTasks = reloadTasksRef.current;
                if (reloadTasks) {
                    await reloadTasks(activeCampaignFilter);
                }
            } catch (error) {
                console.error('Error updating campaign:', error);
                const message = error.message || 'Failed to update campaign';
                setCampaignFormError(message);
            } finally {
                setCampaignFormBusy(false);
            }
        }
    }, [
        campaignFormMode,
        campaignFormValues,
        activeCampaignFilter,
        closeCampaignForm,
        getAuthHeaders,
        onUnauthorized,
        pushToast,
        reloadTasksRef,
        selectedCampaign
    ]);

    const hasCampaigns = campaigns.length > 0;

    return {
        campaigns,
        setCampaigns,
        campaignSidebarCollapsed,
        setCampaignSidebarCollapsed,
        activeCampaignFilter,
        setActiveCampaignFilter,
        taskCampaignSelection,
        setTaskCampaignSelection,
        campaignFormMode,
        setCampaignFormMode,
        campaignFormValues,
        setCampaignFormValues,
        campaignFormBusy,
        setCampaignFormBusy,
        campaignFormError,
        setCampaignFormError,
        getTasksEndpoint,
        refreshCampaigns,
        openCampaignCreateForm,
        openCampaignEditForm,
        closeCampaignForm,
        handleCampaignFieldChange,
        submitCampaignForm,
        campaignLookup,
        selectedCampaign,
        hasCampaigns
    };
};
