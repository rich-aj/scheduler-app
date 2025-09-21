import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import storage from '../utils/storage';

const TeamDashboard = ({ navigation }) => {
    const [upcomingAssignments, setUpcomingAssignments] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [personalAssignments, setPersonalAssignments] = useState([]);
    const [requestStatus, setRequestStatus] = useState(null);

    // Load request status for current user
    const loadRequestStatus = async (user) => {
        if (!user) return;

        try {
            // Try both original and Firebase-cleaned filenames
            const originalFileName = 'requests.json';
            const cleanedFileName = 'requests_DOT_json';

            const originalFileUri = storage.getDocumentDirectory() + originalFileName;
            const cleanedFileUri = storage.getDocumentDirectory() + cleanedFileName;

            // Try original filename first
            let fileExists = await storage.getInfoAsync(originalFileUri);
            let fileUri = originalFileUri;

            // If original doesn't exist, try cleaned filename
            if (!fileExists.exists) {
                fileExists = await storage.getInfoAsync(cleanedFileUri);
                fileUri = cleanedFileUri;
            }

            if (fileExists.exists) {
                const fileContent = await storage.readAsStringAsync(fileUri);
                const requestsData = JSON.parse(fileContent);

                // Find the most recent request for this user
                const userRequests = requestsData.filter(req =>
                    req.teamMemberId === user.teamMemberId || req.teamMemberName === user.name
                );

                if (userRequests.length > 0) {
                    // Get the most recent request
                    const latestRequest = userRequests.sort((a, b) =>
                        new Date(b.submittedAt) - new Date(a.submittedAt)
                    )[0];
                    setRequestStatus(latestRequest);
                } else {
                    setRequestStatus(null);
                }
            } else {
                setRequestStatus(null);
            }
        } catch (error) {
            console.error('Error loading request status:', error);
            setRequestStatus(null);
        }
    };

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

    // Load personal assignments for the current user
    const loadPersonalAssignments = async (user) => {
        if (!user) return;

        try {
            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
            const scheduleFiles = files.filter(file => file.includes('schedule_') && file.endsWith('.json'));

            // Sort schedule files to prioritize complete files over incomplete ones
            scheduleFiles.sort((a, b) => {
                // Prioritize files with more characters (likely complete data)
                return b.length - a.length;
            });



            const assignments = [];
            const currentDate = new Date();

            for (const file of scheduleFiles) {
                try {
                    // Convert the file name back to the proper file URI format (same as ViewMySchedule)
                    const fileName = file.replace('church-scheduler-', '');
                    const fileUri = storage.getDocumentDirectory() + fileName;
                    const fileContent = await storage.readAsStringAsync(fileUri);

                    // Skip empty files (same logic as ViewMySchedule)
                    if (!fileContent || fileContent.length < 10 || fileContent === '{}' || fileContent === 'null') {
                        continue;
                    }

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

                                        // Only include assignments for current date and future dates
                                        // Reset time to start of day for accurate comparison
                                        const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                                        const assignmentDay = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());

                                        if (assignmentDay < today) {
                                            return; // Skip past assignments
                                        }

                                        assignments.push({
                                            date: dateInfo.date,
                                            day: dateInfo.day,
                                            month: schedule.month,
                                            ministry: schedule.ministry,
                                            role: assignment.role || 'Unknown Role',
                                            status: assignment.status || 'confirmed',
                                            fullDate: assignmentDate
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
            assignments.sort((a, b) => a.fullDate - b.fullDate);
            console.log('TeamDashboard - Final assignments found:', assignments);
            setPersonalAssignments(assignments);

            // Store schedule debug info
            let allNames = [];
            let debugDetails = [];
            let firstScheduleMinistry = 'undefined';
            let firstScheduleMonth = 'undefined';
            let errorMessages = [];

            for (const file of scheduleFiles) {
                try {
                    const fileUri = storage.getDocumentDirectory() + file;
                    const fileContent = await storage.readAsStringAsync(fileUri);

                    // Check if file content is empty or invalid
                    if (!fileContent || fileContent.trim() === '') {
                        errorMessages.push(`File ${file} is empty`);
                        continue;
                    }

                    // Debug: show what we're getting from storage
                    errorMessages.push(`Processing file: ${file}`);
                    errorMessages.push(`File content length: ${fileContent.length}`);
                    errorMessages.push(`File content preview: ${fileContent.substring(0, 100)}`);

                    const schedule = JSON.parse(fileContent);
                    errorMessages.push(`Parsed schedule ministry: ${schedule.ministry}`);
                    errorMessages.push(`Parsed schedule month: ${schedule.month}`);

                    // Store first valid ministry and month
                    if (firstScheduleMinistry === 'undefined' && schedule?.ministry) {
                        firstScheduleMinistry = schedule.ministry;
                    }
                    if (firstScheduleMonth === 'undefined' && schedule?.month) {
                        firstScheduleMonth = schedule.month;
                    }

                    debugDetails.push(`File: ${file}`);
                    debugDetails.push(`Ministry: ${schedule.ministry || 'undefined'}`);
                    debugDetails.push(`Month: ${schedule.month || 'undefined'}`);

                    const dateArray = schedule.sundays || schedule.dates;
                    debugDetails.push(`DateArray length: ${dateArray ? dateArray.length : 'null'}`);

                    if (dateArray && Array.isArray(dateArray)) {
                        dateArray.forEach((dateInfo, index) => {
                            debugDetails.push(`Date ${index}: ${dateInfo.date}`);
                            if (dateInfo.assignments && Array.isArray(dateInfo.assignments)) {
                                debugDetails.push(`Assignments count: ${dateInfo.assignments.length}`);
                                dateInfo.assignments.forEach(assignment => {
                                    const assignedValue = assignment.assignedTo || assignment;
                                    if (typeof assignedValue === 'string') {
                                        allNames.push(assignedValue);
                                        debugDetails.push(`Found name: ${assignedValue}`);
                                    }
                                });
                            }
                        });
                    }
                } catch (error) {
                    errorMessages.push(`Error in ${file}: ${error.message}`);
                    console.error(`Error reading file for names: ${file}`, error);
                }
            }

            const errorText = errorMessages.length > 0 ? ` Errors: ${errorMessages.join(', ')}` : '';

            return assignments;
        } catch (error) {
            console.error('Error loading personal assignments:', error);
            return [];
        }
    };

    // Load upcoming assignments for the current user
    const loadUpcomingAssignments = async (user) => {
        if (!user) return 0;

        try {
            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
            const scheduleFiles = files.filter(file => file.includes('schedule_') && file.endsWith('.json'));

            let assignments = 0;
            const currentDate = new Date();

            for (const file of scheduleFiles) {
                try {
                    // For web, files are already in the correct format with church-scheduler- prefix
                    // For mobile, we need to add the prefix
                    const fileUri = storage.getDocumentDirectory() + file;
                    const fileContent = await storage.readAsStringAsync(fileUri);
                    const schedule = JSON.parse(fileContent);

                    // Handle both 'sundays' (old format) and 'dates' (new format)
                    const dateArray = schedule.sundays || schedule.dates;
                    if (dateArray && Array.isArray(dateArray)) {
                        dateArray.forEach(dateInfo => {
                            const date = new Date(dateInfo.date || dateInfo.fullDate);
                            if (date >= currentDate) {
                                // Count assignments for this specific user
                                if (dateInfo.assignments && Array.isArray(dateInfo.assignments)) {
                                    dateInfo.assignments.forEach(assignment => {
                                        // Handle both object format (assignedTo) and string format
                                        const assignedValue = assignment.assignedTo || assignment;
                                        if (assignedValue === user.name) {
                                            assignments++;
                                        }
                                    });
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Error reading schedule file ${file}:`, error);
                }
            }
            return assignments;
        } catch (error) {
            console.error('Error loading upcoming assignments:', error);
            return 0;
        }
    };


    useEffect(() => {
        loadDashboardData();
    }, []);

    // Load dashboard data including current user
    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const user = await loadCurrentUser();
            if (user) {
                const personalAssignments = await loadPersonalAssignments(user);
                const assignmentCount = personalAssignments.length;
                setUpcomingAssignments(assignmentCount);

                // Load request status
                await loadRequestStatus(user);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };


    return (
        <SafeAreaView style={[styles.container, Platform.OS === 'web' && webStyles.container]}>
            <LinearGradient
                colors={['#8B5CF6', '#A855F7', '#C084FC']}
                style={styles.header}
            >
                <Text style={styles.logo}>⛪</Text>
                <Text style={styles.appName}>Team Dashboard</Text>
                <Text style={styles.tagline}>
                    {currentUser ? `Welcome, ${currentUser.name} (${currentUser.teamMemberId})` : 'Your Schedule & Requests'}
                </Text>
            </LinearGradient>

            <ScrollView style={[styles.scrollView, Platform.OS === 'web' && webStyles.scrollView]} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* My Schedule Summary */}
                    <View style={styles.scheduleSummary}>
                        <Text style={styles.sectionTitle}>This Month's Schedule</Text>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryNumber}>
                                {loading ? '...' : upcomingAssignments}
                            </Text>
                            <Text style={styles.summaryLabel}>Upcoming Assignments</Text>
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('ViewMySchedule')}
                        >
                            <LinearGradient
                                colors={['#F3E8FF', '#E9D5FF']}
                                style={styles.gradientCard}
                            >
                                <Text style={styles.actionIcon}>📅</Text>
                                <Text style={styles.actionTitle}>View My Schedule</Text>
                                <Text style={styles.actionDescription}>
                                    See all your upcoming assignments and roles
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('RequestChange')}
                        >
                            <LinearGradient
                                colors={['#F3E8FF', '#E9D5FF']}
                                style={styles.gradientCard}
                            >
                                <Text style={styles.actionIcon}>🔔</Text>
                                <Text style={styles.actionTitle}>Request Change</Text>
                                <Text style={styles.actionDescription}>
                                    Request schedule modifications or role swaps
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Request Status */}
                    {requestStatus && (
                        <View style={styles.requestStatusContainer}>
                            <Text style={styles.requestStatusTitle}>Your Latest Request</Text>
                            <View style={[
                                styles.requestStatusCard,
                                requestStatus.status === 'approved' && styles.requestStatusApproved,
                                requestStatus.status === 'denied' && styles.requestStatusDenied,
                                requestStatus.status === 'pending' && styles.requestStatusPending
                            ]}>
                                <View style={styles.requestStatusHeader}>
                                    <Text style={styles.requestStatusType}>{requestStatus.requestType}</Text>
                                    <Text style={[
                                        styles.requestStatusBadge,
                                        requestStatus.status === 'approved' && styles.requestStatusBadgeApproved,
                                        requestStatus.status === 'denied' && styles.requestStatusBadgeDenied,
                                        requestStatus.status === 'pending' && styles.requestStatusBadgePending
                                    ]}>
                                        {requestStatus.status.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.requestStatusDate}>Date: {requestStatus.selectedDate}</Text>
                                <Text style={styles.requestStatusReason}>Reason: {requestStatus.reason}</Text>
                                {requestStatus.status === 'approved' && (
                                    <Text style={styles.requestStatusMessage}>
                                        ✅ Your request has been approved and you've been removed from this assignment.
                                    </Text>
                                )}
                                {requestStatus.status === 'denied' && (
                                    <Text style={styles.requestStatusMessage}>
                                        ❌ Your request was denied. {requestStatus.adminNotes || 'Please contact admin for details.'}
                                    </Text>
                                )}
                                {requestStatus.status === 'pending' && (
                                    <Text style={styles.requestStatusMessage}>
                                        ⏳ Your request is being reviewed by the admin.
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Upcoming Assignments */}
                    <View style={styles.upcomingContainer}>
                        <Text style={styles.sectionTitle}>Your Upcoming Assignments</Text>

                        {loading ? (
                            <View style={styles.loadingCard}>
                                <Text style={styles.loadingText}>Loading your assignments...</Text>
                            </View>
                        ) : personalAssignments.length > 0 ? (
                            personalAssignments.slice(0, 5).map((assignment, index) => {
                                // Format date as "Month Day, Year"
                                const assignmentDate = new Date(assignment.fullDate);
                                const formattedDate = assignmentDate.toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                });

                                return (
                                    <View key={index} style={styles.assignmentCard}>
                                        <View style={styles.assignmentHeader}>
                                            <Text style={styles.assignmentDate}>{formattedDate}</Text>
                                            <Text style={styles.assignmentTime}>
                                                {assignment.ministry.includes('9:30') ? '9:30 AM' :
                                                    assignment.ministry.includes('11:30') ? '11:30 AM' :
                                                        assignment.ministry.includes('1:30') ? '1:30 PM' :
                                                            assignment.ministry.includes('Thursday') ? '7:00 PM' :
                                                                assignment.ministry.includes('Friday') ? '7:30 PM' :
                                                                    assignment.ministry.includes('Hour Of Meditation') ? '10:00 AM' : 'TBD'}
                                            </Text>
                                        </View>
                                        <View style={styles.assignmentDetails}>
                                            <Text style={styles.assignmentRole}>{assignment.role}</Text>
                                            <Text style={styles.assignmentMinistry}>{assignment.ministry}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            <View style={styles.noAssignmentsCard}>
                                <Text style={styles.noAssignmentsText}>
                                    No upcoming assignments found. Check back later!
                                </Text>
                            </View>
                        )}
                    </View>

                </View>
            </ScrollView>

            {/* Logout Button */}
            <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => navigation.navigate('Landing')}
            >
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF5FF',
    },
    header: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 20,
    },
    logo: {
        fontSize: 48,
        marginBottom: 10,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagline: {
        fontSize: 16,
        color: '#F3E8FF',
        fontStyle: 'italic',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 100,
    },
    scheduleSummary: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 15,
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        padding: 25,
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
    summaryNumber: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#8B5CF6',
        marginBottom: 5,
    },
    summaryLabel: {
        fontSize: 16,
        color: '#7C3AED',
        textAlign: 'center',
    },
    actionsContainer: {
        marginBottom: 30,
    },
    actionCard: {
        marginBottom: 15,
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
    gradientCard: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E9D5FF',
    },
    actionIcon: {
        fontSize: 32,
        marginBottom: 10,
    },
    actionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 8,
        textAlign: 'center',
    },
    actionDescription: {
        fontSize: 14,
        color: '#7C3AED',
        textAlign: 'center',
        lineHeight: 20,
    },
    upcomingContainer: {
        marginBottom: 30,
    },
    requestStatusContainer: {
        marginTop: 20,
    },
    requestStatusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 10,
    },
    requestStatusCard: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    requestStatusApproved: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
    },
    requestStatusDenied: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    requestStatusPending: {
        borderColor: '#F59E0B',
        backgroundColor: '#FFFBEB',
    },
    requestStatusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    requestStatusType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    requestStatusBadge: {
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    requestStatusBadgeApproved: {
        backgroundColor: '#10B981',
        color: '#FFFFFF',
    },
    requestStatusBadgeDenied: {
        backgroundColor: '#EF4444',
        color: '#FFFFFF',
    },
    requestStatusBadgePending: {
        backgroundColor: '#F59E0B',
        color: '#FFFFFF',
    },
    requestStatusDate: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    requestStatusReason: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    requestStatusMessage: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    assignmentCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    assignmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    assignmentDate: {
        fontSize: 16,
        fontWeight: '600',
        color: '#581C87',
    },
    assignmentTime: {
        fontSize: 14,
        color: '#7C3AED',
        fontWeight: '500',
    },
    assignmentDetails: {
        marginTop: 10,
    },
    assignmentRole: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#8B5CF6',
        marginBottom: 5,
    },
    assignmentMinistry: {
        fontSize: 14,
        color: '#7C3AED',
    },
    logoutButton: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: '#EF4444',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    logoutText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    loadingCard: {
        backgroundColor: '#F8F9FA',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    noAssignmentsCard: {
        backgroundColor: '#FEF3C7',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    noAssignmentsText: {
        fontSize: 16,
        color: '#92400E',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    debugContainer: {
        backgroundColor: '#FEF3C7',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    debugTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#92400E',
        marginBottom: 8,
    },
    debugText: {
        fontSize: 14,
        color: '#92400E',
        marginBottom: 4,
    },
    fixButton: {
        backgroundColor: '#10B981',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center',
    },
    fixButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    testButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center',
    },
    testButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

// Web-specific styles
const webStyles = StyleSheet.create({
    container: {
        height: '100vh',
        overflow: 'hidden',
    },
    scrollView: {
        height: 'calc(100vh - 200px)',
        overflowY: 'auto',
    },
});

export default TeamDashboard;
