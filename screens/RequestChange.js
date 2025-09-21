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

const RequestChange = ({ navigation }) => {
    const [requestType, setRequestType] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [reason, setReason] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [availableDates, setAvailableDates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Visual feedback system (since Alert.alert doesn't work on mobile)
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackType, setFeedbackType] = useState(''); // 'success', 'error', 'info'

    const showFeedback = (message, type = 'info') => {
        setFeedbackMessage(message);
        setFeedbackType(type);
        // Clear message after 5 seconds
        setTimeout(() => {
            setFeedbackMessage('');
            setFeedbackType('');
        }, 5000);
    };

    const requestTypes = [
        'Schedule Change',
        'Role Swap',
        'Mark Unavailable',
        'Time Change',
        'Other'
    ];

    // Load current logged-in user
    const loadCurrentUser = async () => {
        try {
            const fileUri = storage.getDocumentDirectory() + 'current_user.json';
            const fileExists = await storage.getInfoAsync(fileUri);

            if (fileExists.exists) {
                const fileContent = await storage.readAsStringAsync(fileUri);
                const userData = JSON.parse(fileContent);
                setCurrentUser(userData);
                return userData;
            }
            return null;
        } catch (error) {
            console.error('Error loading current user:', error);
            return null;
        }
    };

    // Load available dates for requests
    const loadAvailableDates = async (user) => {
        if (!user) return;

        try {
            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
            const scheduleFiles = files.filter(file => file.includes('schedule_') && file.endsWith('.json'));

            const dates = [];
            const now = new Date();
            const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            for (const file of scheduleFiles) {
                try {
                    // Convert the file name back to the proper file URI format
                    const fileName = file.replace('church-scheduler-', '');
                    const fileUri = storage.getDocumentDirectory() + fileName;
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
                                    if (assignedValue === user.name) {
                                        const assignmentDate = new Date(dateInfo.fullDate);

                                        // Only include dates within the next month (current date and future)
                                        if (assignmentDate >= now && assignmentDate <= oneMonthFromNow) {
                                            // Format date as "Day, Month Date - Time"
                                            const formattedDate = assignmentDate.toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                month: 'long',
                                                day: 'numeric'
                                            });

                                            // Determine time based on ministry
                                            let time = '9:30 AM'; // Default for Sunday Service
                                            if (schedule.ministry === 'Sunday Service - 9:30 AM') {
                                                time = '9:30 AM';
                                            } else if (schedule.ministry === 'Sunday Service - 11:30 AM') {
                                                time = '11:30 AM';
                                            } else if (schedule.ministry === 'Sunday Service - 1:30 PM') {
                                                time = '1:30 PM';
                                            } else if (schedule.ministry === 'Thursday Service') {
                                                time = '7:00 PM';
                                            } else if (schedule.ministry === 'Friday Night Prayer') {
                                                time = '7:30 PM';
                                            } else if (schedule.ministry === 'Hour Of Meditation') {
                                                time = '10:00 AM';
                                            }

                                            dates.push({
                                                id: `${schedule.month}-${dateInfo.date}-${assignment.role}-${schedule.ministry}`,
                                                displayText: `${formattedDate} - ${time}`,
                                                fullDate: assignmentDate,
                                                ministry: schedule.ministry,
                                                role: assignment.role || 'Unknown Role',
                                                time: time
                                            });
                                        }
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
            dates.sort((a, b) => a.fullDate - b.fullDate);
            setAvailableDates(dates);
            return dates;
        } catch (error) {
            console.error('Error loading available dates:', error);
            return [];
        }
    };

    // Load data when component mounts
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const user = await loadCurrentUser();
            if (user) {
                await loadAvailableDates(user);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const handleSubmitRequest = async () => {
        showFeedback('Submitting request...', 'info');

        if (!requestType || !selectedDate || !reason) {
            showFeedback('Please fill in all required fields.', 'error');
            return;
        }

        try {
            // Create the request object
            const request = {
                id: `REQ_${Date.now()}`, // Unique ID based on timestamp
                teamMemberId: currentUser?.teamMemberId || 'Unknown',
                teamMemberName: currentUser?.name || 'Unknown',
                requestType: requestType,
                selectedDate: selectedDate,
                reason: reason,
                additionalNotes: additionalNotes,
                status: 'pending', // pending, approved, denied
                submittedAt: new Date().toISOString(),
                adminNotes: '',
                reviewedAt: null,
                reviewedBy: null
            };

            // Load existing requests
            const requestsFileUri = storage.getDocumentDirectory() + 'requests.json';
            let existingRequests = [];

            try {
                const fileExists = await storage.getInfoAsync(requestsFileUri);
                if (fileExists.exists) {
                    const fileContent = await storage.readAsStringAsync(requestsFileUri);
                    existingRequests = JSON.parse(fileContent);
                }
            } catch (error) {
                console.error('Error reading existing requests:', error);
            }

            // Add new request to the list
            existingRequests.push(request);

            // Save updated requests to file
            await storage.writeAsStringAsync(requestsFileUri, JSON.stringify(existingRequests, null, 2));

            // Log activity
            const activity = {
                id: `ACT_${Date.now()}`,
                type: 'request_submitted',
                description: `${currentUser?.name || 'Team Member'} submitted a ${requestType.toLowerCase()} request for ${selectedDate}`,
                timestamp: new Date().toISOString(),
                details: {
                    requestId: request.id,
                    requestType: requestType,
                    selectedDate: selectedDate
                }
            };

            // Save activity
            const activitiesFileUri = storage.getDocumentDirectory() + 'activities.json';
            let existingActivities = [];

            try {
                const activitiesFileExists = await storage.getInfoAsync(activitiesFileUri);
                if (activitiesFileExists.exists) {
                    const activitiesContent = await storage.readAsStringAsync(activitiesFileUri);
                    existingActivities = JSON.parse(activitiesContent);
                }
            } catch (error) {
                console.error('Error reading existing activities:', error);
            }

            existingActivities.push(activity);
            await storage.writeAsStringAsync(activitiesFileUri, JSON.stringify(existingActivities, null, 2));

            showFeedback('Request submitted successfully! You will be notified once an admin reviews it.', 'success');

            // Navigate back after 3 seconds
            setTimeout(() => {
                navigation.navigate('TeamDashboard');
            }, 3000);
        } catch (error) {
            console.error('Error submitting request:', error);
            showFeedback(`Error submitting request: ${error.message}. Please try again.`, 'error');
        }
    };

    // Web-specific styles for scrolling
    const webStyles = Platform.OS === 'web' ? {
        container: {
            height: '100vh',
            overflow: 'hidden',
        },
        scrollView: {
            height: 'calc(100vh - 200px)',
            overflowY: 'auto',
        }
    } : {};

    return (
        <SafeAreaView style={[{ flex: 1, backgroundColor: '#FAF5FF' }, Platform.OS === 'web' && webStyles.container]}>
            {/* Header */}
            <LinearGradient
                colors={['#8B5CF6', '#A855F7', '#C084FC']}
                style={{ paddingTop: 40, paddingBottom: 20, alignItems: 'center' }}
            >
                <TouchableOpacity
                    style={{ position: 'absolute', left: 20, top: 40 }}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={{ color: 'white', fontSize: 16 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>Request Change</Text>
                <Text style={{ color: 'white', fontSize: 14, marginTop: 5 }}>Submit schedule modifications</Text>
            </LinearGradient>

            <ScrollView style={[{ flex: 1 }, Platform.OS === 'web' && webStyles.scrollView]} showsVerticalScrollIndicator={false}>
                <View style={{ padding: 20 }}>
                    {/* Feedback Message Display */}
                    {feedbackMessage && (
                        <View style={{
                            backgroundColor: feedbackType === 'success' ? '#10B981' :
                                feedbackType === 'error' ? '#EF4444' : '#3B82F6',
                            padding: 15,
                            marginBottom: 20,
                            borderRadius: 8
                        }}>
                            <Text style={{ color: 'white', textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>
                                {feedbackMessage}
                            </Text>
                        </View>
                    )}

                    {/* Request Type Selection */}
                    <View style={{ marginBottom: 30 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#581C87', marginBottom: 10 }}>
                            Request Type *
                        </Text>
                        <Text style={{ fontSize: 14, color: '#7C3AED', marginBottom: 15 }}>
                            What type of change are you requesting?
                        </Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            {requestTypes.map((type, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{
                                        backgroundColor: requestType === type ? '#8B5CF6' : '#F3E8FF',
                                        paddingHorizontal: 15,
                                        paddingVertical: 10,
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: requestType === type ? '#8B5CF6' : '#E9D5FF',
                                    }}
                                    onPress={() => setRequestType(type)}
                                >
                                    <Text style={{
                                        color: requestType === type ? 'white' : '#7C3AED',
                                        fontSize: 14,
                                        fontWeight: '600'
                                    }}>
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Date Selection */}
                    <View style={{ marginBottom: 30 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#581C87', marginBottom: 10 }}>
                            Select Date *
                        </Text>
                        <Text style={{ fontSize: 14, color: '#7C3AED', marginBottom: 15 }}>
                            Which date does this request affect? (Your upcoming assignments)
                        </Text>

                        {loading ? (
                            <View style={{ backgroundColor: '#F3E8FF', padding: 20, borderRadius: 10 }}>
                                <Text style={{ color: '#7C3AED', textAlign: 'center' }}>
                                    Loading your upcoming assignments...
                                </Text>
                            </View>
                        ) : availableDates.length > 0 ? (
                            <View>
                                {availableDates.map((dateObj, index) => (
                                    <TouchableOpacity
                                        key={dateObj.id}
                                        style={{
                                            backgroundColor: selectedDate === dateObj.displayText ? '#8B5CF6' : '#F3E8FF',
                                            padding: 15,
                                            marginBottom: 10,
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: selectedDate === dateObj.displayText ? '#8B5CF6' : '#E9D5FF',
                                        }}
                                        onPress={() => setSelectedDate(dateObj.displayText)}
                                    >
                                        <Text style={{
                                            color: selectedDate === dateObj.displayText ? 'white' : '#7C3AED',
                                            fontSize: 16,
                                            fontWeight: '600'
                                        }}>
                                            {dateObj.displayText}
                                        </Text>
                                        <Text style={{
                                            color: selectedDate === dateObj.displayText ? 'white' : '#9CA3AF',
                                            fontSize: 14,
                                            marginTop: 5
                                        }}>
                                            {dateObj.ministry} • {dateObj.role}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View style={{ backgroundColor: '#FEF3C7', padding: 20, borderRadius: 10 }}>
                                <Text style={{ color: '#92400E', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>
                                    No upcoming assignments found.
                                </Text>
                                <Text style={{ color: '#92400E', textAlign: 'center', fontSize: 14, marginTop: 5 }}>
                                    You can only request changes for your assigned roles.
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Reason Input */}
                    <View style={{ marginBottom: 30 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#581C87', marginBottom: 10 }}>
                            Reason for Request *
                        </Text>
                        <Text style={{ fontSize: 14, color: '#7C3AED', marginBottom: 15 }}>
                            Please explain why you need this change
                        </Text>

                        <TextInput
                            style={{
                                backgroundColor: 'white',
                                borderWidth: 1,
                                borderColor: '#E9D5FF',
                                borderRadius: 10,
                                padding: 15,
                                fontSize: 16,
                                color: '#581C87',
                                minHeight: 100,
                                textAlignVertical: 'top'
                            }}
                            placeholder="Enter your reason here..."
                            placeholderTextColor="#9CA3AF"
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    {/* Additional Notes */}
                    <View style={{ marginBottom: 30 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#581C87', marginBottom: 10 }}>
                            Additional Notes
                        </Text>
                        <Text style={{ fontSize: 14, color: '#7C3AED', marginBottom: 15 }}>
                            Any additional information (optional)
                        </Text>

                        <TextInput
                            style={{
                                backgroundColor: 'white',
                                borderWidth: 1,
                                borderColor: '#E9D5FF',
                                borderRadius: 10,
                                padding: 15,
                                fontSize: 16,
                                color: '#581C87',
                                minHeight: 80,
                                textAlignVertical: 'top'
                            }}
                            placeholder="Any additional details..."
                            placeholderTextColor="#9CA3AF"
                            value={additionalNotes}
                            onChangeText={setAdditionalNotes}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 30 }}>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#E5E7EB',
                                padding: 15,
                                borderRadius: 10,
                                alignItems: 'center'
                            }}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={{ color: '#6B7280', fontSize: 16, fontWeight: '600' }}>
                                Cancel
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: availableDates.length === 0 ? '#D1D5DB' : '#8B5CF6',
                                padding: 15,
                                borderRadius: 10,
                                alignItems: 'center'
                            }}
                            onPress={handleSubmitRequest}
                            disabled={availableDates.length === 0}
                        >
                            <Text style={{
                                color: availableDates.length === 0 ? '#9CA3AF' : 'white',
                                fontSize: 16,
                                fontWeight: '600'
                            }}>
                                {availableDates.length === 0 ? 'No Available Dates' : 'Submit Request'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Help Information */}
                    <View style={{ backgroundColor: '#F3E8FF', padding: 20, borderRadius: 10, marginBottom: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: '600', color: '#581C87', marginBottom: 15, textAlign: 'center' }}>
                            Need Help?
                        </Text>
                        <Text style={{ fontSize: 14, color: '#7C3AED', lineHeight: 20 }}>
                            • Schedule Change: Request a different date or time{'\n'}
                            • Role Swap: Exchange roles with another team member{'\n'}
                            • Mark Unavailable: Let admin know you can't serve on a specific date{'\n'}
                            • Time Change: Request a different service time{'\n'}
                            • Other: Any other type of request
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default RequestChange;