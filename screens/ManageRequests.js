import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import storage from '../utils/storage';
import firebaseService from '../services/firebaseService';

const ManageRequests = ({ navigation }) => {
    const [requests, setRequests] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'approved', 'denied'
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackType, setFeedbackType] = useState(''); // 'success', 'error', 'info'
    const [availableFiles, setAvailableFiles] = useState([]);
    const [scheduleMembers, setScheduleMembers] = useState([]);

    // Load available files for debugging
    const loadAvailableFiles = async () => {
        try {
            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
            const scheduleFiles = files.filter(file => file.includes('schedule_'));
            setAvailableFiles(scheduleFiles);

            // Also load the first schedule file to see what members are in it
            if (scheduleFiles.length > 0) {
                // Try to find the file that matches the request date
                let targetFile = scheduleFiles[0]; // Default to first file

                // Look for the file that contains the actual schedule data
                for (const file of scheduleFiles) {
                    try {
                        // Convert the file name back to the proper file URI format (same as other screens)
                        const fileName = file.replace('church-scheduler-', '');
                        const fileUri = storage.getDocumentDirectory() + fileName;
                        const fileContent = await storage.readAsStringAsync(fileUri);
                        const scheduleData = JSON.parse(fileContent);

                        // Check if this file has actual schedule data
                        if (scheduleData.dateArray && scheduleData.dateArray.length > 0) {
                            targetFile = file;
                            console.log('Found schedule file with data:', file);
                            break;
                        }
                    } catch (error) {
                        console.log('Error reading file:', file, error);
                    }
                }

                // Convert the file name back to the proper file URI format
                const fileName = targetFile.replace('church-scheduler-', '');
                const fileUri = storage.getDocumentDirectory() + fileName;
                console.log('Using schedule file:', targetFile, '-> File URI:', fileUri);
                const fileContent = await storage.readAsStringAsync(fileUri);
                const scheduleData = JSON.parse(fileContent);

                // Extract all members from the schedule
                const allMembers = [];
                if (scheduleData.dateArray) {
                    scheduleData.dateArray.forEach(dateEntry => {
                        Object.keys(dateEntry).forEach(role => {
                            if (role !== 'date' && Array.isArray(dateEntry[role])) {
                                dateEntry[role].forEach(member => {
                                    allMembers.push({
                                        name: member.name,
                                        id: member.teamMemberId,
                                        role: role,
                                        date: dateEntry.date
                                    });
                                });
                            }
                        });
                    });
                }
                setScheduleMembers(allMembers);
            }
        } catch (error) {
            console.error('Error loading files:', error);
        }
    };

    // Show feedback message
    const showFeedback = (message, type) => {
        setFeedbackMessage(message);
        setFeedbackType(type);
        setTimeout(() => {
            setFeedbackMessage('');
            setFeedbackType('');
        }, 3000);
    };

    // Filter requests based on active filter
    const getFilteredRequests = () => {
        if (activeFilter === 'all') {
            return requests;
        }
        return requests.filter(request => request.status === activeFilter);
    };

    // Remove team member from schedule
    const removeTeamMemberFromSchedule = async (request) => {
        try {
            console.log('=== REMOVING TEAM MEMBER FROM SCHEDULE ===');
            console.log('Request data:', request);
            console.log('Selected date:', request.selectedDate);

            // Parse the selected date to find the schedule file
            const dateMatch = request.selectedDate.match(/(\w+), (\w+) (\d+) - (\d+:\d+ [AP]M)/);
            if (!dateMatch) {
                console.error('Could not parse date from request:', request.selectedDate);
                showFeedback('Error: Could not parse date from request', 'error');
                return;
            }

            const [, dayName, monthName, dayNumber, time] = dateMatch;
            console.log('Parsed date:', { dayName, monthName, dayNumber, time });

            // Find the schedule file that matches this date
            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
            console.log('All files:', files);

            // Show all schedule files for debugging
            const allScheduleFiles = files.filter(file => file.includes('schedule_'));
            console.log('All schedule files:', allScheduleFiles);

            // Try different filtering approaches
            let scheduleFiles = files.filter(file =>
                file.includes('schedule_') &&
                file.includes(monthName) &&
                file.includes(time.replace(':', '_COLON_').replace(' ', '_SPACE_')) &&
                file.endsWith('.json')
            );

            console.log('Filtered schedule files (method 1):', scheduleFiles);

            // If no files found, try a simpler approach - just look for September
            if (scheduleFiles.length === 0) {
                scheduleFiles = files.filter(file =>
                    file.includes('schedule_') &&
                    file.includes(monthName) &&
                    file.endsWith('.json')
                );
                console.log('Filtered schedule files (method 2):', scheduleFiles);
            }

            // If still no files, try even simpler - just look for schedule files
            if (scheduleFiles.length === 0) {
                scheduleFiles = files.filter(file =>
                    file.includes('schedule_') &&
                    file.endsWith('.json')
                );
                console.log('Filtered schedule files (method 3):', scheduleFiles);
            }

            // If we have multiple files, try to find the one that matches the time
            if (scheduleFiles.length > 1) {
                const timeVariations = [
                    time, // "9:30 AM"
                    time.replace(':', '_COLON_').replace(' ', '_SPACE_'), // "9_COLON_30_SPACE_AM"
                    time.replace(':', '_COLON_'), // "9_COLON_30 AM"
                    time.replace(' ', '_SPACE_'), // "9:30_SPACE_AM"
                ];

                console.log('Time variations to try:', timeVariations);

                for (const timeVar of timeVariations) {
                    const matchingFiles = scheduleFiles.filter(file => file.includes(timeVar));
                    if (matchingFiles.length > 0) {
                        scheduleFiles = matchingFiles;
                        console.log(`Found files matching time variation "${timeVar}":`, scheduleFiles);
                        break;
                    }
                }
            }

            if (scheduleFiles.length === 0) {
                console.error('No schedule file found for:', request.selectedDate);
                showFeedback('Error: No schedule file found', 'error');
                return;
            }

            // Find the schedule file that actually contains data
            let targetFile = scheduleFiles[0]; // Default to first file

            // Look for the file that contains the actual schedule data
            for (const file of scheduleFiles) {
                try {
                    // Convert the file name back to the proper file URI format (same as other screens)
                    const fileName = file.replace('church-scheduler-', '');
                    const testFileUri = storage.getDocumentDirectory() + fileName;
                    const testFileContent = await storage.readAsStringAsync(testFileUri);
                    const testScheduleData = JSON.parse(testFileContent);

                    // Check if this file has actual schedule data
                    if (testScheduleData.dateArray && testScheduleData.dateArray.length > 0) {
                        targetFile = file;
                        console.log('Found schedule file with data:', file);
                        break;
                    }
                } catch (error) {
                    console.log('Error reading file:', file, error);
                }
            }

            // Convert the file name back to the proper file URI format
            const fileName = targetFile.replace('church-scheduler-', '');
            const fileUri = storage.getDocumentDirectory() + fileName;
            console.log('Using schedule file:', targetFile, '-> File URI:', fileUri);

            const fileContent = await storage.readAsStringAsync(fileUri);
            const scheduleData = JSON.parse(fileContent);
            console.log('Schedule data:', scheduleData);

            // Find and remove the team member from the specific date
            let memberRemoved = false;
            if (scheduleData.dateArray) {
                scheduleData.dateArray.forEach(dateEntry => {
                    console.log('Checking date entry:', dateEntry);
                    if (dateEntry.date === dayNumber) {
                        console.log('Found matching date:', dayNumber);
                        console.log('Looking for member name:', request.teamMemberName);

                        // Show all members in all roles for this date
                        Object.keys(dateEntry).forEach(role => {
                            if (role !== 'date' && Array.isArray(dateEntry[role])) {
                                console.log(`All members in ${role}:`, dateEntry[role].map(m => m.name));
                            }
                        });

                        // Remove the team member from all roles for this date
                        Object.keys(dateEntry).forEach(role => {
                            if (role !== 'date' && Array.isArray(dateEntry[role])) {
                                const beforeCount = dateEntry[role].length;
                                console.log(`Before removal - ${role}:`, dateEntry[role]);

                                // Try filtering by team member ID first, then by name
                                const originalMembers = [...dateEntry[role]];
                                dateEntry[role] = dateEntry[role].filter(member => {
                                    // Try ID match first
                                    const idMatch = member.teamMemberId === request.teamMemberId;
                                    // Then try name match
                                    const nameMatch = member.name === request.teamMemberName;

                                    if (idMatch) {
                                        console.log(`Found ID match in ${role}:`, member.teamMemberId, member.name);
                                        return false; // Remove this member
                                    }
                                    if (nameMatch) {
                                        console.log(`Found name match in ${role}:`, member.name);
                                        return false; // Remove this member
                                    }

                                    return true; // Keep this member
                                });

                                const afterCount = dateEntry[role].length;
                                console.log(`After removal - ${role}:`, dateEntry[role]);

                                if (beforeCount > afterCount) {
                                    memberRemoved = true;
                                    console.log(`Removed member from ${role}`);
                                } else {
                                    console.log(`No member removed from ${role}. Looking for ID: "${request.teamMemberId}" or name: "${request.teamMemberName}"`);
                                    console.log(`Available members:`, originalMembers.map(m => `ID:${m.teamMemberId} Name:"${m.name}"`));
                                }
                            }
                        });
                    }
                });
            }

            if (!memberRemoved) {
                console.error('Member was not found in schedule');
                showFeedback('Error: Member not found in schedule', 'error');
                return;
            }

            // Save the updated schedule
            await storage.writeAsStringAsync(fileUri, JSON.stringify(scheduleData, null, 2));
            console.log('Successfully removed', request.teamMemberName, 'from schedule for', request.selectedDate);
            showFeedback(`Removed ${request.teamMemberName} from schedule`, 'success');
        } catch (error) {
            console.error('Error removing team member from schedule:', error);
            showFeedback('Error removing from schedule: ' + error.message, 'error');
            throw error;
        }
    };

    // Load team members from JSON file
    const loadTeamMembers = async () => {
        try {
            const fileName = 'team_members.json';
            const fileUri = storage.getDocumentDirectory() + fileName;

            // Check if file exists
            const fileInfo = await storage.getInfoAsync(fileUri);

            if (fileInfo.exists) {
                const fileContent = await storage.readAsStringAsync(fileUri);
                const teamData = JSON.parse(fileContent);
                const memberNames = teamData.members
                    .filter(member => member.status === 'Active')
                    .map(member => member.name);
                setTeamMembers(memberNames);
            } else {
                // Use default team members if file doesn't exist
                const defaultNames = [
                    'Boma Ibiba', 'Alex Appiah', 'Sarah Johnson', 'Michael Brown',
                    'Emily Davis', 'David Wilson', 'Lisa Anderson', 'James Taylor',
                    'Maria Garcia', 'Robert Lee', 'Jennifer White', 'Christopher Hall',
                    'Amanda Clark', 'Daniel Rodriguez', 'Jessica Martinez', 'Matthew Thompson'
                ];
                setTeamMembers(defaultNames);
            }
        } catch (error) {
            console.error('Error loading team members:', error);
            // Use default team members on error
            const defaultNames = [
                'Boma Ibiba', 'Alex Appiah', 'Sarah Johnson', 'Michael Brown',
                'Emily Davis', 'David Wilson', 'Lisa Anderson', 'James Taylor',
                'Maria Garcia', 'Robert Lee', 'Jennifer White', 'Christopher Hall',
                'Amanda Clark', 'Daniel Rodriguez', 'Jessica Martinez', 'Matthew Thompson'
            ];
            setTeamMembers(defaultNames);
        }
    };

    // Load requests from JSON file
    const loadRequests = async () => {
        try {
            // Try both original and Firebase-cleaned filenames
            const originalFileName = 'requests.json';
            const cleanedFileName = 'requests_DOT_json';

            const originalFileUri = storage.getDocumentDirectory() + originalFileName;
            const cleanedFileUri = storage.getDocumentDirectory() + cleanedFileName;

            console.log('ManageRequests - Looking for requests file:', originalFileUri);
            console.log('ManageRequests - Also checking cleaned file:', cleanedFileUri);

            // Try original filename first
            let fileExists = await storage.getInfoAsync(originalFileUri);
            let fileUri = originalFileUri;

            // If original doesn't exist, try cleaned filename
            if (!fileExists.exists) {
                console.log('ManageRequests - Original file not found, trying cleaned filename');
                fileExists = await storage.getInfoAsync(cleanedFileUri);
                fileUri = cleanedFileUri;
            }

            console.log('ManageRequests - File exists:', fileExists.exists, 'at:', fileUri);

            if (fileExists.exists) {
                const fileContent = await storage.readAsStringAsync(fileUri);
                console.log('ManageRequests - File content length:', fileContent.length);
                const requestsData = JSON.parse(fileContent);
                console.log('ManageRequests - Parsed requests count:', requestsData.length);

                // Remove duplicates based on teamMemberId, selectedDate, and requestType
                const uniqueRequests = requestsData.filter((request, index, self) =>
                    index === self.findIndex(r =>
                        r.teamMemberId === request.teamMemberId &&
                        r.selectedDate === request.selectedDate &&
                        r.requestType === request.requestType
                    )
                );

                console.log('ManageRequests - Unique requests count:', uniqueRequests.length);

                // If we found duplicates, save the cleaned data
                if (uniqueRequests.length !== requestsData.length) {
                    console.log('ManageRequests - Removing duplicates, saving cleaned data');
                    await storage.writeAsStringAsync(fileUri, JSON.stringify(uniqueRequests, null, 2));
                }

                setRequests(uniqueRequests);
            } else {
                console.log('ManageRequests - No requests file found');
                setRequests([]);
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            setRequests([]);
        }
    };

    // Load team members when component mounts
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await loadTeamMembers();
            await loadRequests();
            await loadAvailableFiles();
            setLoading(false);
        };
        loadData();
    }, []);

    const handleApprove = async (requestId) => {
        console.log('Approve button clicked for request:', requestId);
        showFeedback('Approving request...', 'info');

        try {
            console.log('Approving request:', requestId);
            const request = requests.find(req => req.id === requestId);
            if (!request) {
                console.log('Request not found:', requestId);
                showFeedback('Request not found!', 'error');
                return;
            }

            console.log('Found request:', request);

            // Remove team member from schedule
            await removeTeamMemberFromSchedule(request);

            // Update request status
            const updatedRequests = requests.map(req =>
                req.id === requestId
                    ? {
                        ...req,
                        status: 'approved',
                        reviewedAt: new Date().toISOString(),
                        reviewedBy: 'Admin'
                    }
                    : req
            );

            setRequests(updatedRequests);

            // Save to file (use Firebase-cleaned filename)
            const requestsFileUri = storage.getDocumentDirectory() + 'requests_DOT_json';
            await storage.writeAsStringAsync(requestsFileUri, JSON.stringify(updatedRequests, null, 2));

            showFeedback('Request approved and team member removed from schedule!', 'success');
        } catch (error) {
            console.error('Error approving request:', error);
            showFeedback('Failed to approve request. Please try again.', 'error');
        }
    };

    const handleReject = async (requestId) => {
        console.log('Reject button clicked for request:', requestId);
        showFeedback('Rejecting request...', 'info');

        try {
            console.log('Rejecting request:', requestId);
            const updatedRequests = requests.map(req =>
                req.id === requestId
                    ? {
                        ...req,
                        status: 'denied',
                        reviewedAt: new Date().toISOString(),
                        reviewedBy: 'Admin',
                        adminNotes: 'Request rejected by admin'
                    }
                    : req
            );

            setRequests(updatedRequests);

            // Save to file (use Firebase-cleaned filename)
            const requestsFileUri = storage.getDocumentDirectory() + 'requests_DOT_json';
            await storage.writeAsStringAsync(requestsFileUri, JSON.stringify(updatedRequests, null, 2));

            showFeedback('Request has been rejected.', 'success');
        } catch (error) {
            console.error('Error rejecting request:', error);
            showFeedback('Failed to reject request. Please try again.', 'error');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return '#F59E0B';
            case 'approved':
                return '#10B981';
            case 'denied':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return '⏳';
            case 'approved':
                return '✅';
            case 'denied':
                return '❌';
            default:
                return '•';
        }
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
                <Text style={styles.appName}>Manage Requests</Text>
                <Text style={styles.tagline}>Review and approve changes</Text>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}
                bounces={Platform.OS === 'web' ? false : true}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {/* Summary Stats */}

                    {/* Feedback Message Display */}
                    {feedbackMessage && (
                        <View style={{
                            backgroundColor: feedbackType === 'success' ? '#10B981' :
                                feedbackType === 'error' ? '#EF4444' : '#3B82F6',
                            padding: 15,
                            margin: 10,
                            borderRadius: 8
                        }}>
                            <Text style={{ color: 'white', textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>
                                {feedbackMessage}
                            </Text>
                        </View>
                    )}

                    {/* Debug Info for First Request */}
                    {requests.length > 0 && (
                        <View style={{ backgroundColor: 'yellow', padding: 10, margin: 10, borderRadius: 5 }}>
                            <Text style={{ color: 'black', fontSize: 12, fontWeight: 'bold' }}>Debug - First Request:</Text>
                            <Text style={{ color: 'black', fontSize: 10 }}>
                                ID: {requests[0].id}
                            </Text>
                            <Text style={{ color: 'black', fontSize: 10 }}>
                                Team Member ID: {requests[0].teamMemberId}
                            </Text>
                            <Text style={{ color: 'black', fontSize: 10 }}>
                                Team Member Name: {requests[0].teamMemberName}
                            </Text>
                            <Text style={{ color: 'black', fontSize: 10 }}>
                                Member Name: {requests[0].memberName}
                            </Text>
                            <Text style={{ color: 'black', fontSize: 10 }}>
                                Selected Date: {requests[0].selectedDate}
                            </Text>

                            <Text style={{ color: 'black', fontSize: 10, fontWeight: 'bold', marginTop: 5 }}>
                                Available Schedule Files:
                            </Text>
                            {availableFiles.map((file, index) => (
                                <Text key={index} style={{ color: 'black', fontSize: 9 }}>
                                    {file}
                                </Text>
                            ))}

                            <Text style={{ color: 'black', fontSize: 10, fontWeight: 'bold', marginTop: 5 }}>
                                Members in Schedule (Date 21):
                            </Text>
                            {scheduleMembers
                                .filter(member => member.date === '21')
                                .map((member, index) => (
                                    <Text key={index} style={{ color: 'black', fontSize: 9 }}>
                                        {member.role}: {member.name} (ID: {member.id || 'none'})
                                    </Text>
                                ))}

                            {scheduleMembers.filter(member => member.date === '21').length === 0 && (
                                <Text style={{ color: 'red', fontSize: 9, fontStyle: 'italic' }}>
                                    No members found for date 21
                                </Text>
                            )}

                            <Text style={{ color: 'black', fontSize: 10, fontWeight: 'bold', marginTop: 5 }}>
                                All Members in Schedule:
                            </Text>
                            {scheduleMembers.length === 0 ? (
                                <Text style={{ color: 'red', fontSize: 9, fontStyle: 'italic' }}>
                                    No members found in any schedule
                                </Text>
                            ) : (
                                scheduleMembers.map((member, index) => (
                                    <Text key={index} style={{ color: 'black', fontSize: 9 }}>
                                        Date {member.date} - {member.role}: {member.name} (ID: {member.id || 'none'})
                                    </Text>
                                ))
                            )}

                            <Text style={{ color: 'black', fontSize: 10, fontWeight: 'bold', marginTop: 5 }}>
                                File Contents Check:
                            </Text>
                            {availableFiles.map((file, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{ backgroundColor: 'lightblue', padding: 3, margin: 2, borderRadius: 3 }}
                                    onPress={async () => {
                                        try {
                                            // Convert the file name back to the proper file URI format
                                            const fileName = file.replace('church-scheduler-', '');
                                            const fileUri = storage.getDocumentDirectory() + fileName;
                                            const fileContent = await storage.readAsStringAsync(fileUri);
                                            const scheduleData = JSON.parse(fileContent);
                                            showFeedback(`File ${file}: ${scheduleData.dateArray ? scheduleData.dateArray.length : 0} dates`, 'info');
                                        } catch (error) {
                                            showFeedback(`Error reading ${file}: ${error.message}`, 'error');
                                        }
                                    }}
                                >
                                    <Text style={{ color: 'black', fontSize: 8, textAlign: 'center' }}>
                                        Check {file.split('_').pop()}
                                    </Text>
                                </TouchableOpacity>
                            ))}

                            {/* Test All Files Button */}
                            <TouchableOpacity
                                style={{ backgroundColor: 'orange', padding: 5, margin: 5, borderRadius: 3 }}
                                onPress={async () => {
                                    try {
                                        const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
                                        const allFiles = files.filter(file => file.includes('schedule_'));

                                        let results = [];
                                        for (const file of allFiles) {
                                            try {
                                                const fileName = file.replace('church-scheduler-', '');
                                                const fileUri = storage.getDocumentDirectory() + fileName;
                                                const fileContent = await storage.readAsStringAsync(fileUri);
                                                const scheduleData = JSON.parse(fileContent);
                                                results.push(`${file}: ${scheduleData.dateArray ? scheduleData.dateArray.length : 0} dates`);
                                            } catch (error) {
                                                results.push(`${file}: ERROR - ${error.message}`);
                                            }
                                        }

                                        showFeedback(`All files: ${results.join(', ')}`, 'info');
                                    } catch (error) {
                                        showFeedback(`Error: ${error.message}`, 'error');
                                    }
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>
                                    TEST ALL FILES
                                </Text>
                            </TouchableOpacity>

                            {/* Check Firebase Button */}
                            <TouchableOpacity
                                style={{ backgroundColor: 'purple', padding: 5, margin: 5, borderRadius: 3 }}
                                onPress={async () => {
                                    try {
                                        showFeedback('Checking Firebase...', 'info');

                                        // Check what's in Firebase
                                        const result = await firebaseService.readData('files');

                                        if (result.success && result.data) {
                                            const fileCount = Object.keys(result.data).length;
                                            const fileNames = Object.keys(result.data).slice(0, 3);
                                            showFeedback(`Firebase has ${fileCount} files. First 3: ${fileNames.join(', ')}`, 'success');
                                        } else {
                                            showFeedback(`Firebase error: ${result.error}`, 'error');
                                        }
                                    } catch (error) {
                                        showFeedback(`Firebase check failed: ${error.message}`, 'error');
                                    }
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>
                                    CHECK FIREBASE
                                </Text>
                            </TouchableOpacity>

                            {/* Force Sync Button */}
                            <TouchableOpacity
                                style={{ backgroundColor: 'green', padding: 5, margin: 5, borderRadius: 3 }}
                                onPress={async () => {
                                    try {
                                        showFeedback('Syncing from Firebase...', 'info');

                                        // Force sync from Firebase
                                        const result = await storage.forceSyncFromFirebase();

                                        if (result.success) {
                                            showFeedback(`Sync completed! Synced ${result.syncedCount} files.`, 'success');

                                            // Reload the page data
                                            await loadAvailableFiles();
                                        } else {
                                            showFeedback(`Sync failed: ${result.error}`, 'error');
                                        }
                                    } catch (error) {
                                        showFeedback(`Sync failed: ${error.message}`, 'error');
                                    }
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>
                                    FORCE SYNC FROM FIREBASE
                                </Text>
                            </TouchableOpacity>

                            {/* Clear Everything Button */}
                            <TouchableOpacity
                                style={{ backgroundColor: 'red', padding: 5, margin: 5, borderRadius: 3 }}
                                onPress={async () => {
                                    try {
                                        showFeedback('Clearing everything from Firebase...', 'info');

                                        // Clear all data from Firebase
                                        const result = await firebaseService.deleteData('files');

                                        if (result.success) {
                                            showFeedback('Firebase cleared! All data deleted.', 'success');

                                            // Also clear local storage
                                            if (typeof localStorage !== 'undefined') {
                                                const keysToRemove = [];
                                                for (let i = 0; i < localStorage.length; i++) {
                                                    const key = localStorage.key(i);
                                                    if (key && key.startsWith('church-scheduler-')) {
                                                        keysToRemove.push(key);
                                                    }
                                                }
                                                keysToRemove.forEach(key => localStorage.removeItem(key));
                                            }

                                            showFeedback('Local storage also cleared! Fresh start ready.', 'success');
                                        } else {
                                            showFeedback(`Failed to clear Firebase: ${result.error}`, 'error');
                                        }
                                    } catch (error) {
                                        showFeedback(`Clear failed: ${error.message}`, 'error');
                                    }
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>
                                    CLEAR EVERYTHING
                                </Text>
                            </TouchableOpacity>

                            {/* Test Button */}
                            <TouchableOpacity
                                style={{ backgroundColor: 'red', padding: 5, marginTop: 5, borderRadius: 3 }}
                                onPress={async () => {
                                    showFeedback('Testing schedule removal...', 'info');
                                    try {
                                        await removeTeamMemberFromSchedule(requests[0]);
                                    } catch (error) {
                                        showFeedback('Test failed: ' + error.message, 'error');
                                    }
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 10, textAlign: 'center' }}>TEST REMOVAL</Text>
                            </TouchableOpacity>
                        </View>
                    )}


                    <View style={styles.statsContainer}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>
                                {requests.filter(r => r.status === 'pending').length}
                            </Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>
                                {requests.filter(r => r.status === 'approved').length}
                            </Text>
                            <Text style={styles.statLabel}>Approved</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>
                                {requests.filter(r => r.status === 'denied').length}
                            </Text>
                            <Text style={styles.statLabel}>Rejected</Text>
                        </View>
                    </View>

                    {/* Filter Tabs */}
                    <View style={styles.filterContainer}>
                        <TouchableOpacity
                            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
                            onPress={() => setActiveFilter('all')}
                        >
                            <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
                                All ({requests.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterTab, activeFilter === 'pending' && styles.filterTabActive]}
                            onPress={() => setActiveFilter('pending')}
                        >
                            <Text style={[styles.filterTabText, activeFilter === 'pending' && styles.filterTabTextActive]}>
                                Pending ({requests.filter(r => r.status === 'pending').length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterTab, activeFilter === 'approved' && styles.filterTabActive]}
                            onPress={() => setActiveFilter('approved')}
                        >
                            <Text style={[styles.filterTabText, activeFilter === 'approved' && styles.filterTabTextActive]}>
                                Approved ({requests.filter(r => r.status === 'approved').length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterTab, activeFilter === 'denied' && styles.filterTabActive]}
                            onPress={() => setActiveFilter('denied')}
                        >
                            <Text style={[styles.filterTabText, activeFilter === 'denied' && styles.filterTabTextActive]}>
                                Rejected ({requests.filter(r => r.status === 'denied').length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Loading State */}
                    {loading && (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Loading team members...</Text>
                        </View>
                    )}

                    {/* Empty State - No Requests */}
                    {!loading && getFilteredRequests().length === 0 && (
                        <View style={styles.emptyStateContainer}>
                            <View style={styles.emptyStateIcon}>
                                <Text style={styles.emptyStateIconText}>📋</Text>
                            </View>
                            <Text style={styles.emptyStateTitle}>No Pending Requests</Text>
                            <Text style={styles.emptyStateSubtitle}>
                                All team members are currently satisfied with their schedules.
                                New requests will appear here when team members submit them.
                            </Text>

                            {/* Team Members Info */}
                            <View style={styles.teamInfoContainer}>
                                <Text style={styles.teamInfoTitle}>Active Team Members ({teamMembers.length})</Text>
                                <View style={styles.teamMembersList}>
                                    {teamMembers.map((member, index) => (
                                        <View key={index} style={styles.teamMemberItem}>
                                            <Text style={styles.teamMemberName}>{member}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Testing Info */}
                            <View style={styles.testingInfoContainer}>
                                <Text style={styles.testingInfoTitle}>🧪 Testing Ready</Text>
                                <Text style={styles.testingInfoText}>
                                    This screen is ready for testing when team members start submitting requests.
                                    The request functionality will be implemented in the next phase.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Requests List */}
                    {!loading && getFilteredRequests().length > 0 && (
                        <View style={styles.requestsContainer}>
                            {getFilteredRequests().map((request) => (
                                <View key={request.id} style={styles.requestCard}>
                                    <View style={styles.requestHeader}>
                                        <View style={styles.memberInfo}>
                                            <Text style={styles.memberName}>{request.memberName}</Text>
                                            <Text style={styles.requestType}>{request.requestType}</Text>
                                        </View>
                                        <View style={styles.statusContainer}>
                                            <Text style={styles.statusIcon}>{getStatusIcon(request.status)}</Text>
                                            <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                                                {request.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.requestDetails}>Request: {request.requestType} for {request.selectedDate}</Text>
                                    <Text style={styles.requestReason}>Reason: {request.reason}</Text>
                                    <Text style={styles.requestDate}>Submitted: {new Date(request.submittedAt).toLocaleDateString()}</Text>

                                    {request.status === 'pending' && (
                                        <View style={styles.actionButtons}>
                                            <TouchableOpacity
                                                style={styles.approveButton}
                                                onPress={() => handleApprove(request.id)}
                                            >
                                                <Text style={styles.approveButtonText}>Approve</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.rejectButton}
                                                onPress={() => handleReject(request.id)}
                                            >
                                                <Text style={styles.rejectButtonText}>Reject</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {request.status === 'approved' && (
                                        <View style={styles.approvedBadge}>
                                            <Text style={styles.approvedText}>✓ Approved</Text>
                                        </View>
                                    )}

                                    {request.status === 'denied' && (
                                        <View style={styles.rejectedBadge}>
                                            <Text style={styles.rejectedText}>✗ Rejected</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Bulk Actions */}
                    <View style={styles.bulkActionsContainer}>
                        <Text style={styles.bulkActionsTitle}>Bulk Actions</Text>
                        <View style={styles.bulkButtons}>
                            <TouchableOpacity
                                style={styles.bulkApproveButton}
                                onPress={() => Alert.alert('Bulk Approve', 'Approve all pending requests?')}
                            >
                                <Text style={styles.bulkApproveText}>Approve All Pending</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.bulkRejectButton}
                                onPress={() => Alert.alert('Bulk Reject', 'Reject all pending requests?')}
                            >
                                <Text style={styles.bulkRejectText}>Reject All Pending</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
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
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    statCard: {
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
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#8B5CF6',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#7C3AED',
        textAlign: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        marginBottom: 25,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 5,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    filterTabText: {
        fontSize: 14,
        color: '#7C3AED',
        fontWeight: '500',
    },
    filterTabActive: {
        backgroundColor: '#8B5CF6',
    },
    filterTabTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    requestsContainer: {
        marginBottom: 30,
    },
    requestCard: {
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
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#581C87',
        marginBottom: 5,
    },
    requestType: {
        fontSize: 14,
        color: '#7C3AED',
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusContainer: {
        alignItems: 'center',
    },
    statusIcon: {
        fontSize: 20,
        marginBottom: 5,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    requestDetails: {
        fontSize: 16,
        color: '#581C87',
        marginBottom: 10,
        lineHeight: 22,
    },
    requestReason: {
        fontSize: 14,
        color: '#7C3AED',
        marginBottom: 8,
        fontStyle: 'italic',
    },
    requestDate: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 15,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    approveButton: {
        backgroundColor: '#10B981',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    approveButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    rejectButton: {
        backgroundColor: '#EF4444',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    rejectButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    approvedBadge: {
        backgroundColor: '#D1FAE5',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    approvedText: {
        color: '#065F46',
        fontSize: 12,
        fontWeight: '600',
    },
    rejectedBadge: {
        backgroundColor: '#FEE2E2',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    rejectedText: {
        color: '#991B1B',
        fontSize: 12,
        fontWeight: '600',
    },
    bulkActionsContainer: {
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
    bulkActionsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 15,
        textAlign: 'center',
    },
    bulkButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    bulkApproveButton: {
        backgroundColor: '#10B981',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    bulkApproveText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    bulkRejectButton: {
        backgroundColor: '#EF4444',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    bulkRejectText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    loadingContainer: {
        backgroundColor: '#FFFFFF',
        padding: 40,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    loadingText: {
        fontSize: 16,
        color: '#7C3AED',
        fontWeight: '500',
    },
    emptyStateContainer: {
        backgroundColor: '#FFFFFF',
        padding: 30,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    emptyStateIcon: {
        marginBottom: 20,
    },
    emptyStateIconText: {
        fontSize: 48,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyStateSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    teamInfoContainer: {
        width: '100%',
        backgroundColor: '#F8F9FA',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
    },
    teamInfoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 15,
        textAlign: 'center',
    },
    teamMembersList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    teamMemberItem: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        margin: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    teamMemberName: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    testingInfoContainer: {
        width: '100%',
        backgroundColor: '#FEF3C7',
        padding: 20,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    testingInfoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#92400E',
        marginBottom: 8,
    },
    testingInfoText: {
        fontSize: 14,
        color: '#92400E',
        lineHeight: 20,
    },
});

export default ManageRequests;
