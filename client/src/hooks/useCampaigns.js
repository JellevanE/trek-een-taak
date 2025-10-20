import { useState, useEffect, useMemo, useCallback } from 'react';

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

    const refreshCampaigns = useCallback(() => {
        if (!token) {
            setCampaigns([]);
            return Promise.resolve(null);
        }
        const headers = { Authorization: `Bearer ${token}` };
        return fetch('/api/campaigns', { headers })
            .then((res) => {
                if (res.status === 401) {
                    onUnauthorized?.();
                    setCampaigns([]);
                    return null;
                }
                if (!res.ok) {
                    throw new Error(`Failed to load campaigns: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data && Array.isArray(data.campaigns)) {
                    setCampaigns(data.campaigns);
                } else {
                    setCampaigns([]);
                }
                return data;
            })
            .catch((error) => {
                console.error('Error fetching campaigns:', error);
                return null;
            });
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

    const submitCampaignForm = useCallback((event) => {
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

        const handleError = (body) => {
            const verb = campaignFormMode === 'create' ? 'create' : 'update';
            const message = body && body.error ? body.error : `Failed to ${verb} campaign`;
            setCampaignFormError(message);
            setCampaignFormBusy(false);
        };

        if (campaignFormMode === 'create') {
            fetch('/api/campaigns', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        handleError(body);
                        return null;
                    }
                    return res.json();
                })
                .then(async (created) => {
                    if (!created) return;
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
                    setCampaignFormBusy(false);
                })
                .catch((error) => {
                    console.error('Error creating campaign:', error);
                    setCampaignFormError('Failed to create campaign');
                    setCampaignFormBusy(false);
                });
        } else if (campaignFormMode === 'edit' && selectedCampaign) {
            fetch(`/api/campaigns/${selectedCampaign.id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        handleError(body);
                        return null;
                    }
                    return res.json();
                })
                .then(async (updated) => {
                    if (!updated) return;
                    closeCampaignForm();
                    pushToast('Campaign updated', 'success');
                    const reloadTasks = reloadTasksRef.current;
                    if (reloadTasks) {
                        await reloadTasks(activeCampaignFilter);
                    }
                    setCampaignFormBusy(false);
                })
                .catch((error) => {
                    console.error('Error updating campaign:', error);
                    setCampaignFormError('Failed to update campaign');
                    setCampaignFormBusy(false);
                });
        }
    }, [
        campaignFormMode,
        campaignFormValues,
        activeCampaignFilter,
        closeCampaignForm,
        getAuthHeaders,
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
