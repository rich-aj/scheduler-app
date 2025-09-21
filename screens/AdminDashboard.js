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
import * as FileSystem from 'expo-file-system';
import storage from '../utils/storage';

const AdminDashboard = ({ navigation }) => {
    const [teamMembers, setTeamMembers] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [monthlyAssignments, setMonthlyAssignments] = useState(0);
    const [loading, setLoading] = useState(true);

    // Load team members data
    const loadTeamMembers = async () => {
        try {
            const fileName = 'team_members.json';
            const fileUri = storage.getDocumentDirectory() + fileName;

            const fileInfo = await storage.getInfoAsync(fileUri);

            if (fileInfo.exists) {
                const fileContent = await storage.readAsStringAsync(fileUri);
                const teamData = JSON.parse(fileContent);
                return teamData.members || [];
            } else {
                return [];
            }
        } catch (error) {
            console.error('Error loading team members:', error);
            return [];
        }
    };

    // Load pending requests data
    const loadPendingRequests = async () => {
        try {
            const fileName = 'pending_requests.json';
            const fileUri = storage.getDocumentDirectory() + fileName;

            const fileInfo = await storage.getInfoAsync(fileUri);

            if (fileInfo.exists) {
                const fileContent = await storage.readAsStringAsync(fileUri);
                const requestsData = JSON.parse(fileContent);
                return requestsData.requests || [];
            } else {
                return [];
            }
        } catch (error) {
            console.error('Error loading pending requests:', error);
            return [];
        }
    };

    // Load total assignments count from all published schedules
    const loadMonthlyAssignments = async () => {
        try {
            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
            const scheduleFiles = files.filter(file => file.includes('schedule_') && file.endsWith('.json'));

            console.log('AdminDashboard - Found schedule files:', scheduleFiles);

            let totalAssignments = 0;

            for (const file of scheduleFiles) {
                try {
                    // Convert the file name back to the proper file URI format
                    const fileName = file.replace('church-scheduler-', '');
                    const fileUri = storage.getDocumentDirectory() + fileName;

                    console.log('AdminDashboard - Reading file:', fileUri, 'from localStorage key:', file);

                    const fileContent = await storage.readAsStringAsync(fileUri);
                    const schedule = JSON.parse(fileContent);

                    console.log('AdminDashboard - Parsed schedule:', schedule);

                    // Count assignments from all published schedules
                    // Check both 'sundays' (old format) and 'dates' (new format)
                    const dateArray = schedule.sundays || schedule.dates;
                    if (dateArray && Array.isArray(dateArray)) {
                        // For each date in the schedule
                        dateArray.forEach((dateInfo, index) => {
                            if (dateInfo.assignments && Array.isArray(dateInfo.assignments)) {
                                // Count non-empty assignments
                                const validAssignments = dateInfo.assignments.filter(assignment => {
                                    // Handle both object format (assignedTo) and string format
                                    const assignedValue = assignment.assignedTo || assignment;
                                    return assignedValue && assignedValue.trim() !== '' && assignedValue !== 'Unassigned';
                                });
                                totalAssignments += validAssignments.length;
                                console.log(`AdminDashboard - Date ${index}: ${validAssignments.length} valid assignments`);
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Error reading schedule file ${file}:`, error);
                }
            }

            console.log('AdminDashboard - Total assignments:', totalAssignments);
            return totalAssignments;
        } catch (error) {
            console.error('Error loading monthly assignments:', error);
            return 0;
        }
    };

    // Load all dashboard data
    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [members, requests, assignments] = await Promise.all([
                loadTeamMembers(),
                loadPendingRequests(),
                loadMonthlyAssignments()
            ]);

            setTeamMembers(members);
            setPendingRequests(requests);
            setMonthlyAssignments(assignments);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };


    // Start real-time sync
    useEffect(() => {
        if (Platform.OS === 'web') {
            const unsubscribe = storage.startRealtimeSync((result) => {
                if (result.success) {
                    console.log('Real-time sync: Data updated from Firebase');
                    // Reload dashboard data when Firebase data changes
                    loadDashboardData();
                }
            });

            return () => {
                if (unsubscribe) {
                    unsubscribe();
                }
            };
        }
    }, []);


    useEffect(() => {
        loadDashboardData();
    }, []);


    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}
                bounces={Platform.OS === 'web' ? false : true}
                keyboardShouldPersistTaps="handled"
            >
                <LinearGradient
                    colors={['#8B5CF6', '#A855F7', '#C084FC']}
                    style={styles.header}
                >
                    <Text style={styles.logo}>⛪</Text>
                    <Text style={styles.appName}>Admin Dashboard</Text>
                    <Text style={styles.tagline}>Pastoral Team Management</Text>
                </LinearGradient>
                <View style={styles.content}>
                    {/* Quick Stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>
                                {loading ? '...' : teamMembers.length}
                            </Text>
                            <Text style={styles.statLabel}>Team Members</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>
                                {loading ? '...' : pendingRequests.length}
                            </Text>
                            <Text style={styles.statLabel}>Pending Requests</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>
                                {loading ? '...' : monthlyAssignments}
                            </Text>
                            <Text style={styles.statLabel}>Total Assignments</Text>
                        </View>
                    </View>


                    {/* Main Actions */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('CreateSchedule')}
                        >
                            <LinearGradient
                                colors={['#F3E8FF', '#E9D5FF']}
                                style={styles.gradientCard}
                            >
                                <Text style={styles.actionIcon}>📅</Text>
                                <Text style={styles.actionTitle}>Create Monthly Schedule</Text>
                                <Text style={styles.actionDescription}>
                                    Generate and assign roles for the upcoming month
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('ManageRequests')}
                        >
                            <LinearGradient
                                colors={['#F3E8FF', '#E9D5FF']}
                                style={styles.gradientCard}
                            >
                                <Text style={styles.actionIcon}>🔔</Text>
                                <Text style={styles.actionTitle}>Manage Requests</Text>
                                <Text style={styles.actionDescription}>
                                    Review and approve schedule change requests
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('ViewSchedule')}
                        >
                            <LinearGradient
                                colors={['#F3E8FF', '#E9D5FF']}
                                style={styles.gradientCard}
                            >
                                <Text style={styles.actionIcon}>👥</Text>
                                <Text style={styles.actionTitle}>View Team Schedule</Text>
                                <Text style={styles.actionDescription}>
                                    See current month's assignments and roles
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('TeamManagement')}
                        >
                            <LinearGradient
                                colors={['#F3E8FF', '#E9D5FF']}
                                style={styles.gradientCard}
                            >
                                <Text style={styles.actionIcon}>⚙️</Text>
                                <Text style={styles.actionTitle}>Team Management</Text>
                                <Text style={styles.actionDescription}>
                                    Add/remove team members and manage roles
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>


                    {/* Logout Button */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={() => navigation.navigate('Landing')}
                    >
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
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
    urlText: {
        fontSize: 12,
        color: '#E0E7FF',
        textAlign: 'center',
        marginTop: 8,
        fontFamily: 'monospace',
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
        paddingBottom: 100,
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 15,
    },
    logoutButton: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        alignSelf: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    logoutText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default AdminDashboard;
