import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import storage from '../utils/storage';

const TeamManagement = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddMember, setShowAddMember] = useState(false);
    const [showEditMember, setShowEditMember] = useState(false);
    const [showViewSchedule, setShowViewSchedule] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [memberSchedule, setMemberSchedule] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);
    const [totalServices, setTotalServices] = useState(0);
    const [loading, setLoading] = useState(true);
    const [newMember, setNewMember] = useState({
        name: '',
        email: '',
        phone: '',
        roles: [],
        status: 'Active'
    });
    const [editMember, setEditMember] = useState({
        name: '',
        email: '',
        phone: '',
        roles: [],
        status: 'Active'
    });

    // Default team members for initial setup - now empty so you can add your own
    const defaultTeamMembers = [];

    const availableRoles = [
        'Main Lead A',
        'Main Lead B',
        'Security',
        'Support 1',
        'Support 2',
        'Evening'
    ];

    // JSON file storage functions
    const saveTeamMembersToFile = async (members) => {
        try {
            const fileName = 'team_members.json';
            const fileUri = storage.getDocumentDirectory() + fileName;

            const teamData = {
                lastUpdated: new Date().toISOString(),
                members: members
            };

            await storage.writeAsStringAsync(
                fileUri,
                JSON.stringify(teamData, null, 2)
            );

            return { success: true, fileName };
        } catch (error) {
            console.error('Error saving team members:', error);
            return { success: false, error: error.message };
        }
    };

    // Load total services count from published schedules
    const loadTotalServices = async () => {
        try {
            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
            const scheduleFiles = files.filter(file => file.includes('schedule_') && file.endsWith('.json'));

            let totalServices = 0;

            for (const file of scheduleFiles) {
                try {
                    // Convert the file name back to the proper file URI format
                    const fileName = file.replace('church-scheduler-', '');
                    const fileUri = storage.getDocumentDirectory() + fileName;

                    const fileContent = await storage.readAsStringAsync(fileUri);
                    const schedule = JSON.parse(fileContent);

                    // Count assignments from all published schedules
                    const dateArray = schedule.sundays || schedule.dates;
                    if (dateArray && Array.isArray(dateArray)) {
                        dateArray.forEach((dateInfo) => {
                            if (dateInfo.assignments && Array.isArray(dateInfo.assignments)) {
                                // Count non-empty assignments
                                const validAssignments = dateInfo.assignments.filter(assignment => {
                                    const assignedValue = assignment.assignedTo || assignment;
                                    return assignedValue && assignedValue.trim() !== '' && assignedValue !== 'Unassigned';
                                });
                                totalServices += validAssignments.length;
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Error reading schedule file ${file}:`, error);
                }
            }

            return totalServices;
        } catch (error) {
            console.error('Error loading total services:', error);
            return 0;
        }
    };

    const loadTeamMembersFromFile = async () => {
        try {
            const fileName = 'team_members.json';
            const fileUri = storage.getDocumentDirectory() + fileName;

            // Check if file exists
            const fileInfo = await storage.getInfoAsync(fileUri);

            if (fileInfo.exists) {
                const fileContent = await storage.readAsStringAsync(fileUri);
                const teamData = JSON.parse(fileContent);
                let members = teamData.members || [];

                // Add teamMemberId to existing members if missing
                let needsUpdate = false;
                members = members.map((member, index) => {
                    if (!member.teamMemberId) {
                        needsUpdate = true;
                        return {
                            ...member,
                            teamMemberId: `TM${String(index + 1).padStart(3, '0')}`
                        };
                    }
                    return member;
                });

                // Save updated members if teamMemberId was added
                if (needsUpdate) {
                    await saveTeamMembersToFile(members);
                    console.log('Updated team members with teamMemberId');
                }

                return members;
            } else {
                // File doesn't exist, create with default data
                await saveTeamMembersToFile(defaultTeamMembers);
                return defaultTeamMembers;
            }
        } catch (error) {
            console.error('Error loading team members:', error);
            // Return default data if loading fails
            return defaultTeamMembers;
        }
    };

    // Reset team members to new default names
    const resetTeamMembers = async () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Reset Team Members\n\nThis will replace all current team members with the new default team. This action cannot be undone.\n\nAre you sure?');
            if (confirmed) {
                try {
                    await saveTeamMembersToFile(defaultTeamMembers);
                    setTeamMembers(defaultTeamMembers);

                    // Add activity
                    await addActivity('reset', 'Reset team members to new default list');

                    window.alert('Success! Team members have been reset to the new default list with updated names.');
                } catch (error) {
                    window.alert(`Error: Failed to reset team members - ${error.message}`);
                }
            }
        } else {
            Alert.alert(
                'Reset Team Members',
                'This will replace all current team members with the new default team. This action cannot be undone.',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    },
                    {
                        text: 'Reset',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await saveTeamMembersToFile(defaultTeamMembers);
                                setTeamMembers(defaultTeamMembers);

                                // Add activity
                                await addActivity('reset', 'Reset team members to new default list');

                                Alert.alert(
                                    'Success',
                                    'Team members have been reset to the new default list with updated names.',
                                    [{ text: 'OK' }]
                                );
                            } catch (error) {
                                Alert.alert('Error', `Failed to reset team members: ${error.message}`);
                            }
                        }
                    }
                ]
            );
        }
    };

    // Clear all data and start fresh
    const clearAllData = async () => {
        Alert.alert(
            'Clear All Data',
            'This will delete all team members, schedules, and activities. You will start with a fresh team list. This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete all data files
                            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
                            const dataFiles = files.filter(file =>
                                file.startsWith('team_') ||
                                file.startsWith('schedule_') ||
                                file.startsWith('pending_')
                            );

                            for (const file of dataFiles) {
                                try {
                                    await storage.deleteAsync(storage.getDocumentDirectory() + file);
                                } catch (error) {
                                    console.error(`Error deleting ${file}:`, error);
                                }
                            }

                            // Reset to default team
                            await saveTeamMembersToFile(defaultTeamMembers);
                            setTeamMembers(defaultTeamMembers);
                            setRecentActivities([]);

                            Alert.alert(
                                'Success',
                                'All data has been cleared. You now have a fresh team list with the new names.',
                                [{ text: 'OK' }]
                            );
                        } catch (error) {
                            Alert.alert('Error', `Failed to clear data: ${error.message}`);
                        }
                    }
                }
            ]
        );
    };

    // Activity tracking functions
    const saveActivityToFile = async (activities) => {
        try {
            const fileName = 'team_activities.json';
            const fileUri = storage.getDocumentDirectory() + fileName;

            const activityData = {
                lastUpdated: new Date().toISOString(),
                activities: activities
            };

            await storage.writeAsStringAsync(
                fileUri,
                JSON.stringify(activityData, null, 2)
            );

            return { success: true, fileName };
        } catch (error) {
            console.error('Error saving activities:', error);
            return { success: false, error: error.message };
        }
    };

    const loadActivitiesFromFile = async () => {
        try {
            const fileName = 'team_activities.json';
            const fileUri = storage.getDocumentDirectory() + fileName;

            const fileInfo = await storage.getInfoAsync(fileUri);

            if (fileInfo.exists) {
                const fileContent = await storage.readAsStringAsync(fileUri);
                const activityData = JSON.parse(fileContent);
                return activityData.activities || [];
            } else {
                return [];
            }
        } catch (error) {
            console.error('Error loading activities:', error);
            return [];
        }
    };

    const addActivity = async (type, description, memberName = null) => {
        const newActivity = {
            id: Date.now().toString(),
            type: type, // 'added', 'edited', 'removed', 'role_updated'
            description: description,
            memberName: memberName,
            timestamp: new Date().toISOString(),
            timeAgo: 'Just now'
        };

        const updatedActivities = [newActivity, ...recentActivities].slice(0, 10); // Keep only last 10
        setRecentActivities(updatedActivities);

        // Save to file
        await saveActivityToFile(updatedActivities);
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return activityTime.toLocaleDateString();
    };

    // Load team members and activities when component mounts
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [members, activities, services] = await Promise.all([
                loadTeamMembersFromFile(),
                loadActivitiesFromFile(),
                loadTotalServices()
            ]);
            setTeamMembers(members);
            setTotalServices(services);

            // Format time ago for activities
            const formattedActivities = activities.map(activity => ({
                ...activity,
                timeAgo: formatTimeAgo(activity.timestamp)
            }));
            setRecentActivities(formattedActivities);
            setLoading(false);
        };
        loadData();
    }, []);

    const filteredMembers = teamMembers.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.roles.some(role => role.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleAddMember = async () => {
        if (!newMember.name || !newMember.email) {
            Alert.alert('Missing Information', 'Please fill in name and email fields.');
            return;
        }

        // Check if email already exists
        const emailExists = teamMembers.some(member =>
            member.email.toLowerCase() === newMember.email.toLowerCase()
        );

        if (emailExists) {
            Alert.alert('Email Exists', 'A team member with this email already exists.');
            return;
        }

        try {
            // Create new member with unique ID
            const newId = Math.max(...teamMembers.map(m => m.id), 0) + 1;
            const nextTeamMemberId = `TM${String(teamMembers.length + 1).padStart(3, '0')}`;
            const memberToAdd = {
                ...newMember,
                id: newId,
                teamMemberId: nextTeamMemberId,
                joinDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                totalServices: 0
            };

            // Add to team members
            const updatedMembers = [...teamMembers, memberToAdd];
            setTeamMembers(updatedMembers);

            // Save to file
            const saveResult = await saveTeamMembersToFile(updatedMembers);

            if (saveResult.success) {
                // Add activity
                await addActivity('added', `Added new team member with roles: ${memberToAdd.roles.join(', ')}`, memberToAdd.name);

                Alert.alert(
                    'Member Added',
                    `${newMember.name} has been added to the team successfully!`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setShowAddMember(false);
                                setNewMember({ name: '', email: '', phone: '', roles: [], status: 'Active' });
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', `Failed to save member: ${saveResult.error}`);
            }
        } catch (error) {
            Alert.alert('Error', `Failed to add member: ${error.message}`);
        }
    };

    const handleRemoveMember = async (memberId, memberName) => {
        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${memberName} from the team?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Remove member from team
                            const updatedMembers = teamMembers.filter(member => member.id !== memberId);
                            setTeamMembers(updatedMembers);

                            // Save to file
                            const saveResult = await saveTeamMembersToFile(updatedMembers);

                            if (saveResult.success) {
                                // Add activity
                                await addActivity('removed', `Removed team member from the team`, memberName);

                                Alert.alert('Removed', `${memberName} has been removed from the team.`);
                            } else {
                                Alert.alert('Error', `Failed to save changes: ${saveResult.error}`);
                            }
                        } catch (error) {
                            Alert.alert('Error', `Failed to remove member: ${error.message}`);
                        }
                    }
                }
            ]
        );
    };

    const toggleRole = (role) => {
        setNewMember(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role]
        }));
    };

    const updateMemberRoles = async (memberId, newRoles) => {
        try {
            const member = teamMembers.find(m => m.id === memberId);
            if (!member) return;

            const updatedMembers = teamMembers.map(member =>
                member.id === memberId
                    ? { ...member, roles: newRoles }
                    : member
            );
            setTeamMembers(updatedMembers);

            // Save to file
            const saveResult = await saveTeamMembersToFile(updatedMembers);

            if (saveResult.success) {
                // Add activity for role change
                const oldRoles = member.roles;
                const addedRoles = newRoles.filter(role => !oldRoles.includes(role));
                const removedRoles = oldRoles.filter(role => !newRoles.includes(role));

                let description = '';
                if (addedRoles.length > 0 && removedRoles.length > 0) {
                    description = `Updated roles: added ${addedRoles.join(', ')}, removed ${removedRoles.join(', ')}`;
                } else if (addedRoles.length > 0) {
                    description = `Added roles: ${addedRoles.join(', ')}`;
                } else if (removedRoles.length > 0) {
                    description = `Removed roles: ${removedRoles.join(', ')}`;
                }

                if (description) {
                    await addActivity('role_updated', description, member.name);
                }
            } else {
                Alert.alert('Error', `Failed to save changes: ${saveResult.error}`);
            }
        } catch (error) {
            Alert.alert('Error', `Failed to update member: ${error.message}`);
        }
    };

    const toggleMemberRole = (memberId, role) => {
        const member = teamMembers.find(m => m.id === memberId);
        if (!member) return;

        const newRoles = member.roles.includes(role)
            ? member.roles.filter(r => r !== role)
            : [...member.roles, role];

        updateMemberRoles(memberId, newRoles);
    };

    // Edit member functions
    const handleEditMember = (member) => {
        setSelectedMember(member);
        setEditMember({
            name: member.name,
            email: member.email,
            phone: member.phone,
            roles: [...member.roles],
            status: member.status,
            teamMemberId: member.teamMemberId
        });
        setShowEditMember(true);
    };

    const handleSaveEdit = async () => {
        if (!editMember.name || !editMember.email) {
            Alert.alert('Missing Information', 'Please fill in name and email fields.');
            return;
        }

        // Check if email already exists (excluding current member)
        const emailExists = teamMembers.some(member =>
            member.email.toLowerCase() === editMember.email.toLowerCase() &&
            member.id !== selectedMember.id
        );

        if (emailExists) {
            Alert.alert('Email Exists', 'A team member with this email already exists.');
            return;
        }

        try {
            const updatedMembers = teamMembers.map(member =>
                member.id === selectedMember.id
                    ? { ...member, ...editMember }
                    : member
            );
            setTeamMembers(updatedMembers);

            const saveResult = await saveTeamMembersToFile(updatedMembers);

            if (saveResult.success) {
                // Add activity for profile edit
                const changes = [];
                if (selectedMember.name !== editMember.name) changes.push('name');
                if (selectedMember.email !== editMember.email) changes.push('email');
                if (selectedMember.phone !== editMember.phone) changes.push('phone');
                if (selectedMember.status !== editMember.status) changes.push('status');

                if (changes.length > 0) {
                    await addActivity('edited', `Updated profile: ${changes.join(', ')}`, editMember.name);
                }

                Alert.alert('Updated', `${editMember.name}'s profile has been updated successfully!`);
                setShowEditMember(false);
                setSelectedMember(null);
            } else {
                Alert.alert('Error', `Failed to save changes: ${saveResult.error}`);
            }
        } catch (error) {
            Alert.alert('Error', `Failed to update member: ${error.message}`);
        }
    };

    // View schedule functions
    const handleViewSchedule = async (member) => {
        setSelectedMember(member);
        setShowViewSchedule(true);

        try {
            // Load all published schedules
            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
            const scheduleFiles = files.filter(file => file.includes('schedule_') && file.endsWith('.json'));

            console.log('TeamManagement - Found schedule files:', scheduleFiles);

            const memberAssignments = [];

            for (const file of scheduleFiles) {
                try {
                    // Convert the file name back to the proper file URI format
                    const fileName = file.replace('church-scheduler-', '');
                    const fileUri = storage.getDocumentDirectory() + fileName;

                    console.log('TeamManagement - Reading file:', fileUri, 'from localStorage key:', file);

                    const fileContent = await storage.readAsStringAsync(fileUri);
                    const schedule = JSON.parse(fileContent);

                    // Handle both 'sundays' (old format) and 'dates' (new format)
                    const dateArray = schedule.sundays || schedule.dates;
                    if (dateArray && Array.isArray(dateArray)) {
                        dateArray.forEach(dateInfo => {
                            if (dateInfo.assignments && Array.isArray(dateInfo.assignments)) {
                                dateInfo.assignments.forEach(assignment => {
                                    // Handle both object format (assignedTo) and string format
                                    const assignedValue = assignment.assignedTo || assignment;
                                    if (assignedValue === member.name) {
                                        memberAssignments.push({
                                            date: dateInfo.date,
                                            month: schedule.month,
                                            ministry: schedule.ministry,
                                            role: assignment.role || 'Unknown Role',
                                            status: assignment.status || 'confirmed'
                                        });
                                    }
                                });
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Error reading schedule file ${file}:`, error);
                }
            }

            // Sort by date
            memberAssignments.sort((a, b) => new Date(a.date) - new Date(b.date));
            console.log('TeamManagement - Found assignments for', member.name, ':', memberAssignments);
            setMemberSchedule(memberAssignments);

        } catch (error) {
            console.error('Error loading member schedule:', error);
            setMemberSchedule([]);
        }
    };

    const toggleEditRole = (role) => {
        setEditMember(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role]
        }));
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#8B5CF6', '#A855F7', '#C084FC']}
                style={styles.header}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.appName}>Team Management</Text>
                <Text style={styles.tagline}>Manage team members & roles</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity style={styles.updateButton} onPress={async () => {
                        try {
                            // Update team member IDs
                            const updatedMembers = teamMembers.map((member, index) => ({
                                ...member,
                                teamMemberId: `TM${String(index + 1).padStart(3, '0')}`
                            }));

                            // Save updated members
                            await saveTeamMembersToFile(updatedMembers);
                            setTeamMembers(updatedMembers);

                            if (Platform.OS === 'web') {
                                window.alert('Success! Team member IDs have been updated!');
                            } else {
                                Alert.alert('Success', 'Team member IDs have been updated!');
                            }
                        } catch (error) {
                            if (Platform.OS === 'web') {
                                window.alert(`Error: Failed to update team member IDs - ${error.message}`);
                            } else {
                                Alert.alert('Error', 'Failed to update team member IDs');
                            }
                        }
                    }}>
                        <Text style={styles.updateButtonText}>🆔 Update IDs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resetButton} onPress={() => {
                        if (Platform.OS === 'web') {
                            const choice = window.confirm('Reset Options\n\nChoose how you want to reset the team data:\n\nOK = Reset Team Only\nCancel = Cancel');
                            if (choice) {
                                resetTeamMembers();
                            }
                        } else {
                            Alert.alert(
                                'Reset Options',
                                'Choose how you want to reset the team data:',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Reset Team Only',
                                        onPress: resetTeamMembers
                                    },
                                    {
                                        text: 'Clear All Data',
                                        style: 'destructive',
                                        onPress: clearAllData
                                    }
                                ]
                            );
                        }
                    }}>
                        <Text style={styles.resetButtonText}>🔄 Reset</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}
                bounces={Platform.OS === 'web' ? false : true}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {/* Loading State */}
                    {loading && (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Loading team members...</Text>
                        </View>
                    )}

                    {/* Main Content - Only show when not loading */}
                    {!loading && (
                        <>
                            {/* Team Overview */}
                            <View style={styles.overviewSection}>
                                <Text style={styles.sectionTitle}>Team Overview</Text>
                                <View style={styles.overviewCards}>
                                    <View style={styles.overviewCard}>
                                        <Text style={styles.overviewNumber}>{teamMembers.length}</Text>
                                        <Text style={styles.overviewLabel}>Total Members</Text>
                                    </View>
                                    <View style={styles.overviewCard}>
                                        <Text style={styles.overviewNumber}>
                                            {teamMembers.filter(m => m.status === 'Active').length}
                                        </Text>
                                        <Text style={styles.overviewLabel}>Active Members</Text>
                                    </View>
                                    <View style={styles.overviewCard}>
                                        <Text style={styles.overviewNumber}>
                                            {totalServices}
                                        </Text>
                                        <Text style={styles.overviewLabel}>Total Services</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Recent Activity */}
                            <View style={styles.activitySection}>
                                <Text style={styles.sectionTitle}>Recent Activity</Text>
                                {recentActivities.length === 0 ? (
                                    <View style={styles.noActivityContainer}>
                                        <Text style={styles.noActivityText}>No recent activity</Text>
                                        <Text style={styles.noActivitySubtext}>Team changes will appear here</Text>
                                    </View>
                                ) : (
                                    <View style={styles.activityList}>
                                        {recentActivities.slice(0, 5).map((activity, index) => (
                                            <View key={activity.id} style={styles.activityItem}>
                                                <View style={styles.activityIcon}>
                                                    <Text style={styles.activityIconText}>
                                                        {activity.type === 'added' ? '➕' :
                                                            activity.type === 'edited' ? '✏️' :
                                                                activity.type === 'removed' ? '❌' :
                                                                    activity.type === 'role_updated' ? '🔄' : '📝'}
                                                    </Text>
                                                </View>
                                                <View style={styles.activityContent}>
                                                    <Text style={styles.activityDescription}>
                                                        {activity.description}
                                                    </Text>
                                                    {activity.memberName && (
                                                        <Text style={styles.activityMember}>
                                                            {activity.memberName}
                                                        </Text>
                                                    )}
                                                </View>
                                                <Text style={styles.activityTime}>
                                                    {activity.timeAgo}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Search and Add Member */}
                            <View style={styles.actionsSection}>
                                <View style={styles.searchContainer}>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search members, roles, or email..."
                                        placeholderTextColor="#9CA3AF"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.addMemberButton}
                                    onPress={() => setShowAddMember(true)}
                                >
                                    <LinearGradient
                                        colors={['#8B5CF6', '#A855F7']}
                                        style={styles.gradientButton}
                                    >
                                        <Text style={styles.addMemberButtonText}>+ Add Member</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            {/* Add Member Form */}
                            {showAddMember && (
                                <View style={styles.addMemberSection}>
                                    <Text style={styles.sectionTitle}>Add New Team Member</Text>
                                    <View style={styles.formContainer}>
                                        {/* Member ID Field - Auto-generated and non-editable */}
                                        <View style={styles.memberIdContainer}>
                                            <Text style={styles.memberIdLabel}>Member ID:</Text>
                                            <Text style={styles.memberIdValue}>
                                                TM{String(teamMembers.length + 1).padStart(3, '0')}
                                            </Text>
                                        </View>

                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Full Name *"
                                            placeholderTextColor="#9CA3AF"
                                            value={newMember.name}
                                            onChangeText={(text) => setNewMember(prev => ({ ...prev, name: text }))}
                                        />

                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Email Address *"
                                            placeholderTextColor="#9CA3AF"
                                            value={newMember.email}
                                            onChangeText={(text) => setNewMember(prev => ({ ...prev, email: text }))}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />

                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Phone Number"
                                            placeholderTextColor="#9CA3AF"
                                            value={newMember.phone}
                                            onChangeText={(text) => setNewMember(prev => ({ ...prev, phone: text }))}
                                            keyboardType="phone-pad"
                                        />

                                        <Text style={styles.rolesLabel}>Select Roles:</Text>
                                        <View style={styles.rolesContainer}>
                                            {availableRoles.map((role, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={[
                                                        styles.roleChip,
                                                        newMember.roles.includes(role) && styles.roleChipActive
                                                    ]}
                                                    onPress={() => toggleRole(role)}
                                                >
                                                    <Text style={[
                                                        styles.roleChipText,
                                                        newMember.roles.includes(role) && styles.roleChipTextActive
                                                    ]}>
                                                        {role}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <View style={styles.formActions}>
                                            <TouchableOpacity
                                                style={styles.cancelButton}
                                                onPress={() => setShowAddMember(false)}
                                            >
                                                <Text style={styles.cancelButtonText}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.saveButton}
                                                onPress={handleAddMember}
                                            >
                                                <Text style={styles.saveButtonText}>Add Member</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Team Members List */}
                            <View style={styles.membersSection}>
                                <Text style={styles.sectionTitle}>Team Members</Text>
                                {filteredMembers.map((member) => (
                                    <View key={member.id} style={styles.memberCard}>
                                        <View style={styles.memberHeader}>
                                            <View style={styles.memberInfo}>
                                                <View style={styles.memberNameRow}>
                                                    <Text style={styles.memberName}>{member.name}</Text>
                                                    <Text style={styles.memberIdBadge}>
                                                        {member.teamMemberId || 'TM000'}
                                                    </Text>
                                                </View>
                                                <Text style={styles.memberEmail}>{member.email}</Text>
                                                <Text style={styles.memberPhone}>{member.phone}</Text>
                                            </View>
                                            <View style={styles.memberStatus}>
                                                <View style={[
                                                    styles.statusBadge,
                                                    { backgroundColor: member.status === 'Active' ? '#D1FAE5' : '#FEE2E2' }
                                                ]}>
                                                    <Text style={[
                                                        styles.statusText,
                                                        { color: member.status === 'Active' ? '#065F46' : '#991B1B' }
                                                    ]}>
                                                        {member.status}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.memberDetails}>
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Roles:</Text>
                                                <View style={styles.rolesList}>
                                                    {member.roles.map((role, index) => (
                                                        <Text key={index} style={styles.roleTag}>{role}</Text>
                                                    ))}
                                                </View>
                                            </View>

                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Join Date:</Text>
                                                <Text style={styles.detailValue}>{member.joinDate}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.memberActions}>
                                            <TouchableOpacity
                                                style={styles.editButton}
                                                onPress={() => handleEditMember(member)}
                                            >
                                                <Text style={styles.editButtonText}>Edit</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.viewButton}
                                                onPress={() => handleViewSchedule(member)}
                                            >
                                                <Text style={styles.viewButtonText}>View Schedule</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.removeButton}
                                                onPress={() => handleRemoveMember(member.id, member.name)}
                                            >
                                                <Text style={styles.removeButtonText}>Remove</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Edit Member Modal */}
            {showEditMember && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Member</Text>

                        {/* Member ID Field - Non-editable */}
                        <View style={styles.memberIdContainer}>
                            <Text style={styles.memberIdLabel}>Member ID:</Text>
                            <Text style={styles.memberIdValue}>
                                {editMember.teamMemberId || 'TM000'}
                            </Text>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={editMember.name}
                            onChangeText={(text) => setEditMember(prev => ({ ...prev, name: text }))}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={editMember.email}
                            onChangeText={(text) => setEditMember(prev => ({ ...prev, email: text }))}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            value={editMember.phone}
                            onChangeText={(text) => setEditMember(prev => ({ ...prev, phone: text }))}
                            keyboardType="phone-pad"
                        />

                        <View style={styles.rolesSection}>
                            <Text style={styles.rolesTitle}>Roles:</Text>
                            <View style={styles.rolesContainer}>
                                {availableRoles.map((role, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.roleButton,
                                            editMember.roles.includes(role) && styles.roleButtonActive
                                        ]}
                                        onPress={() => toggleEditRole(role)}
                                    >
                                        <Text style={[
                                            styles.roleButtonText,
                                            editMember.roles.includes(role) && styles.roleButtonTextActive
                                        ]}>
                                            {role}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setShowEditMember(false);
                                    setSelectedMember(null);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSaveEdit}
                            >
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* View Schedule Modal */}
            {showViewSchedule && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{selectedMember?.name}'s Schedule</Text>

                        <ScrollView style={styles.scheduleList} showsVerticalScrollIndicator={false}>
                            {memberSchedule.length === 0 ? (
                                <View style={styles.noScheduleContainer}>
                                    <Text style={styles.noScheduleText}>
                                        No schedule assignments found for {selectedMember?.name}.
                                    </Text>
                                    <Text style={styles.noScheduleSubtext}>
                                        Assignments will appear here once schedules are published.
                                    </Text>
                                </View>
                            ) : (
                                memberSchedule.map((assignment, index) => (
                                    <View key={index} style={styles.scheduleItem}>
                                        <View style={styles.scheduleHeader}>
                                            <Text style={styles.scheduleDate}>{assignment.date}</Text>
                                            <Text style={styles.scheduleMonth}>{assignment.month}</Text>
                                        </View>
                                        <View style={styles.scheduleDetails}>
                                            <Text style={styles.scheduleRole}>Role: {assignment.role}</Text>
                                            <Text style={styles.scheduleMinistry}>Ministry: {assignment.ministry}</Text>
                                            <View style={styles.scheduleStatus}>
                                                <Text style={[
                                                    styles.statusText,
                                                    { color: assignment.status === 'confirmed' ? '#10B981' : '#F59E0B' }
                                                ]}>
                                                    {assignment.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => {
                                setShowViewSchedule(false);
                                setSelectedMember(null);
                                setMemberSchedule([]);
                            }}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF5FF',
        ...(Platform.OS === 'web' && {
            height: '100vh',
            overflow: 'hidden',
        }),
    },
    header: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 20,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 40,
        padding: 10,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    appName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagline: {
        fontSize: 14,
        color: '#F3E8FF',
        fontStyle: 'italic',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
        alignSelf: 'center',
    },
    updateButton: {
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    updateButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    resetButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    resetButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
        ...(Platform.OS === 'web' && {
            height: '100vh',
            overflow: 'auto',
        }),
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    loadingContainer: {
        backgroundColor: '#FFFFFF',
        padding: 40,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    overviewSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 15,
    },
    overviewCards: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    overviewCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 5,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    overviewNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#8B5CF6',
        marginBottom: 5,
    },
    overviewLabel: {
        fontSize: 12,
        color: '#7C3AED',
        textAlign: 'center',
    },
    actionsSection: {
        marginBottom: 30,
    },
    searchContainer: {
        marginBottom: 15,
    },
    searchInput: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        color: '#1F2937',
    },
    addMemberButton: {
        borderRadius: 12,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    gradientButton: {
        paddingVertical: 16,
        borderRadius: 12,
    },
    addMemberButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    addMemberSection: {
        marginBottom: 30,
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    formContainer: {
        marginTop: 15,
    },
    formInput: {
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        color: '#1F2937',
        marginBottom: 15,
    },
    memberIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        marginBottom: 15,
    },
    memberIdLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        marginRight: 10,
    },
    memberIdValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8B5CF6',
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C4B5FD',
    },
    rolesLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 15,
    },
    rolesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    roleChip: {
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        marginRight: 10,
        marginBottom: 10,
    },
    roleChipActive: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    roleChipText: {
        color: '#7C3AED',
        fontSize: 14,
        fontWeight: '500',
    },
    roleChipTextActive: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    formActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#6B7280',
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#10B981',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    membersSection: {
        marginBottom: 30,
    },
    memberCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        marginBottom: 15,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    memberHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    memberInfo: {
        flex: 1,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    memberName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#581C87',
        flex: 1,
    },
    memberIdBadge: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#8B5CF6',
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#C4B5FD',
    },
    memberEmail: {
        fontSize: 14,
        color: '#7C3AED',
        marginBottom: 3,
    },
    memberPhone: {
        fontSize: 14,
        color: '#6B7280',
    },
    memberStatus: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    memberDetails: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#581C87',
        width: 80,
    },
    detailValue: {
        fontSize: 14,
        color: '#7C3AED',
        flex: 1,
    },
    rolesList: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    roleTag: {
        backgroundColor: '#F3E8FF',
        color: '#7C3AED',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        marginRight: 8,
        marginBottom: 5,
    },
    memberActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    editButton: {
        backgroundColor: 'transparent',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#8B5CF6',
        flex: 1,
        marginRight: 8,
        alignItems: 'center',
    },
    editButtonText: {
        color: '#8B5CF6',
        fontSize: 12,
        fontWeight: '600',
    },
    viewButton: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    viewButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    removeButton: {
        backgroundColor: '#EF4444',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        marginLeft: 8,
        alignItems: 'center',
    },
    removeButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    // Activity section styles
    activitySection: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 20,
    },
    noActivityContainer: {
        padding: 20,
        alignItems: 'center',
    },
    noActivityText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 5,
    },
    noActivitySubtext: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    activityList: {
        gap: 12,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#8B5CF6',
    },
    activityIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityIconText: {
        fontSize: 16,
    },
    activityContent: {
        flex: 1,
    },
    activityDescription: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
        marginBottom: 2,
    },
    activityMember: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    activityTime: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    // Modal styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        margin: 20,
        maxHeight: '80%',
        width: '90%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#581C87',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#F9FAFB',
    },
    rolesSection: {
        marginBottom: 20,
    },
    rolesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 10,
    },
    rolesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
    },
    roleButtonActive: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    roleButtonText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    roleButtonTextActive: {
        color: '#FFFFFF',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
        marginRight: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#8B5CF6',
        marginLeft: 10,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Schedule view modal styles
    scheduleList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    noScheduleContainer: {
        padding: 20,
        alignItems: 'center',
    },
    noScheduleText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 10,
    },
    noScheduleSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    scheduleItem: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#8B5CF6',
    },
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    scheduleDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#581C87',
    },
    scheduleMonth: {
        fontSize: 12,
        color: '#6B7280',
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    scheduleDetails: {
        gap: 5,
    },
    scheduleRole: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    scheduleMinistry: {
        fontSize: 14,
        color: '#6B7280',
    },
    scheduleStatus: {
        alignSelf: 'flex-start',
        marginTop: 5,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    closeButton: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default TeamManagement;
