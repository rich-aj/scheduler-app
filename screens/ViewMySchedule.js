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

const ViewMySchedule = ({ navigation }) => {
    // Get current month dynamically - start from current month
    const getCurrentMonth = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 8 = September)

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        return `${months[currentMonth]} ${currentYear}`;
    };

    // Generate months from current month to end of year
    const getAvailableMonths = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 8 = September)

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const availableMonths = [];
        for (let i = currentMonth; i < 12; i++) {
            availableMonths.push(`${months[i]} ${currentYear}`);
        }

        return availableMonths;
    };

    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [currentUser, setCurrentUser] = useState(null);
    const [mySchedule, setMySchedule] = useState([]);
    const [availableMonths, setAvailableMonths] = useState(getAvailableMonths());
    const [loading, setLoading] = useState(true);

    const filters = ['All', 'This Week', 'This Month', 'Upcoming'];

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

    // Load personal schedule from published schedules
    const loadPersonalSchedule = async (user) => {
        if (!user) return;

        try {
            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
            const scheduleFiles = files.filter(file => file.includes('schedule_') && file.endsWith('.json'));

            const assignments = [];
            const months = new Set(getAvailableMonths());

            for (const file of scheduleFiles) {
                try {
                    // Convert the file name back to the proper file URI format
                    const fileName = file.replace('church-scheduler-', '');
                    const fileUri = storage.getDocumentDirectory() + fileName;
                    const fileContent = await storage.readAsStringAsync(fileUri);
                    const schedule = JSON.parse(fileContent);

                    months.add(schedule.month);

                    // Only process schedules for the selected month
                    if (schedule.month !== selectedMonth) {
                        continue;
                    }

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
                                        const currentDate = new Date();

                                        // Only include assignments for current date and future dates
                                        // Reset time to start of day for accurate comparison
                                        const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                                        const assignmentDay = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());

                                        if (assignmentDay < today) {
                                            return; // Skip past assignments
                                        }

                                        // Format date as "Day, Month Date"
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

                                        assignments.push({
                                            id: `${schedule.month}-${dateInfo.date}-${assignment.role}-${schedule.ministry}`,
                                            date: formattedDate,
                                            time: time,
                                            ministry: schedule.ministry,
                                            role: assignment.role || 'Unknown Role',
                                            status: assignment.status === 'confirmed' ? 'Confirmed' : 'Pending',
                                            month: schedule.month,
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
            setMySchedule(assignments);

            // Sort months chronologically
            const sortedMonths = Array.from(months).sort((a, b) => {
                const dateA = new Date(a);
                const dateB = new Date(b);
                return dateA - dateB;
            });
            setAvailableMonths(sortedMonths);
            return assignments;
        } catch (error) {
            console.error('Error loading personal schedule:', error);
            return [];
        }
    };

    // Load data when component mounts
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const user = await loadCurrentUser();
            if (user) {
                await loadPersonalSchedule(user);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    // Reload data when selected month changes
    useEffect(() => {
        const loadData = async () => {
            if (currentUser) {
                setLoading(true);
                await loadPersonalSchedule(currentUser);
                setLoading(false);
            }
        };
        loadData();
    }, [selectedMonth]);

    // Static data for fallback (will be replaced by real data)
    const staticMySchedule = [
        {
            id: 1,
            date: 'Sunday, Dec 15',
            time: '9:00 AM',
            ministry: 'Sunday Service',
            role: 'Worship Leader',
            status: 'Confirmed',
            location: 'Main Sanctuary',
            notes: 'Prepare 3 songs for worship set'
        },
        {
            id: 2,
            date: 'Wednesday, Dec 18',
            time: '7:00 PM',
            ministry: 'Prayer Meeting',
            role: 'Prayer Leader',
            status: 'Confirmed',
            location: 'Prayer Room',
            notes: 'Focus on youth ministry prayer requests'
        },
        {
            id: 3,
            date: 'Friday, Dec 20',
            time: '6:30 PM',
            ministry: 'Youth Service',
            role: 'Youth Leader',
            status: 'Confirmed',
            location: 'Youth Hall',
            notes: 'Bible study on faith and courage'
        },
        {
            id: 4,
            date: 'Sunday, Dec 22',
            time: '9:00 AM',
            ministry: 'Sunday Service',
            role: 'Usher',
            status: 'Confirmed',
            location: 'Main Sanctuary',
            notes: 'Greet and seat congregation'
        },
        {
            id: 5,
            date: 'Wednesday, Dec 25',
            time: '7:00 PM',
            ministry: 'Christmas Service',
            role: 'Worship Leader',
            status: 'Confirmed',
            location: 'Main Sanctuary',
            notes: 'Special Christmas worship set'
        },
        {
            id: 6,
            date: 'Sunday, Dec 29',
            time: '9:00 AM',
            ministry: 'Sunday Service',
            role: 'Sound Technician',
            status: 'Pending',
            location: 'Main Sanctuary',
            notes: 'Assist with audio setup'
        }
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'Confirmed':
                return '#10B981';
            case 'Pending':
                return '#F59E0B';
            case 'Unavailable':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Confirmed':
                return '✅';
            case 'Pending':
                return '⏳';
            case 'Unavailable':
                return '❌';
            default:
                return '•';
        }
    };

    const getFilteredSchedule = () => {
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        switch (selectedFilter) {
            case 'This Week':
                return mySchedule.filter(item => {
                    if (!item.fullDate) return false;
                    const itemDate = new Date(item.fullDate);
                    return itemDate >= now && itemDate <= oneWeekFromNow;
                });
            case 'This Month':
                return mySchedule.filter(item => {
                    if (!item.fullDate) return false;
                    const itemDate = new Date(item.fullDate);
                    return itemDate.getMonth() === now.getMonth() &&
                        itemDate.getFullYear() === now.getFullYear();
                });
            case 'Upcoming':
                return mySchedule.filter(item => {
                    if (!item.fullDate) return false;
                    const itemDate = new Date(item.fullDate);
                    return itemDate >= now && item.status === 'Confirmed';
                });
            default:
                return mySchedule;
        }
    };

    const filteredSchedule = getFilteredSchedule();

    return (
        <SafeAreaView style={[styles.container, Platform.OS === 'web' && webStyles.container]}>
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
                <Text style={styles.appName}>My Schedule</Text>
                <Text style={styles.tagline}>Your upcoming assignments</Text>
            </LinearGradient>

            <ScrollView style={[styles.scrollView, Platform.OS === 'web' && webStyles.scrollView]} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Month Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Select Month</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.monthScrollView}
                            contentContainerStyle={styles.monthContainer}
                        >
                            {availableMonths.map((month, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.monthButton,
                                        selectedMonth === month && styles.monthButtonActive
                                    ]}
                                    onPress={() => setSelectedMonth(month)}
                                >
                                    <Text style={[
                                        styles.monthButtonText,
                                        selectedMonth === month && styles.monthButtonTextActive
                                    ]}>
                                        {month}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Filter Tabs */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Filter Schedule</Text>
                        <View style={styles.filterContainer}>
                            {filters.map((filter, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.filterTab,
                                        selectedFilter === filter && styles.filterTabActive
                                    ]}
                                    onPress={() => setSelectedFilter(filter)}
                                >
                                    <Text style={[
                                        styles.filterTabText,
                                        selectedFilter === filter && styles.filterTabTextActive
                                    ]}>
                                        {filter}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Schedule Summary */}
                    <View style={styles.summarySection}>
                        <Text style={styles.sectionTitle}>Schedule Summary</Text>
                        <View style={styles.summaryCards}>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryNumber}>
                                    {filteredSchedule.length}
                                </Text>
                                <Text style={styles.summaryLabel}>Total Assignments</Text>
                            </View>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryNumber}>
                                    {filteredSchedule.filter(item => item.status === 'Confirmed').length}
                                </Text>
                                <Text style={styles.summaryLabel}>Confirmed</Text>
                            </View>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryNumber}>
                                    {filteredSchedule.filter(item => item.status === 'Pending').length}
                                </Text>
                                <Text style={styles.summaryLabel}>Pending</Text>
                            </View>
                        </View>
                    </View>


                    {/* Schedule List */}
                    <View style={styles.scheduleSection}>
                        <Text style={styles.sectionTitle}>My Assignments</Text>
                        {loading ? (
                            <View style={styles.loadingCard}>
                                <Text style={styles.loadingText}>Loading your assignments...</Text>
                            </View>
                        ) : filteredSchedule.length > 0 ? (
                            filteredSchedule.map((assignment) => (
                                <View key={assignment.id} style={styles.assignmentCard}>
                                    <View style={styles.assignmentHeader}>
                                        <View style={styles.assignmentInfo}>
                                            <Text style={styles.assignmentDate}>{assignment.date}</Text>
                                            <Text style={styles.assignmentTime}>{assignment.time}</Text>
                                        </View>
                                        <View style={styles.statusContainer}>
                                            <Text style={styles.statusIcon}>{getStatusIcon(assignment.status)}</Text>
                                            <Text style={[styles.statusText, { color: getStatusColor(assignment.status) }]}>
                                                {assignment.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.assignmentDetails}>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Ministry:</Text>
                                            <Text style={styles.detailValue}>{assignment.ministry}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Role:</Text>
                                            <Text style={styles.detailValue}>{assignment.role}</Text>
                                        </View>


                                        {assignment.notes && (
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Notes:</Text>
                                                <Text style={styles.detailValue}>{assignment.notes}</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.assignmentActions}>
                                        <TouchableOpacity
                                            style={styles.requestChangeButton}
                                            onPress={() => navigation.navigate('RequestChange')}
                                        >
                                            <Text style={styles.requestChangeText}>Request Change</Text>
                                        </TouchableOpacity>

                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.noAssignmentsCard}>
                                <Text style={styles.noAssignmentsText}>
                                    No assignments found for the selected period.
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.quickActionsSection}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <View style={styles.quickActionsContainer}>
                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={() => navigation.navigate('RequestChange')}
                            >
                                <Text style={styles.quickActionIcon}>🔔</Text>
                                <Text style={styles.quickActionText}>Request Change</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={() => Alert.alert('Calendar', 'Add to calendar')}
                            >
                                <Text style={styles.quickActionIcon}>📅</Text>
                                <Text style={styles.quickActionText}>Add to Calendar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={() => Alert.alert('Share', 'Share schedule')}
                            >
                                <Text style={styles.quickActionIcon}>📤</Text>
                                <Text style={styles.quickActionText}>Share Schedule</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={() => Alert.alert('Export', 'Export as PDF')}
                            >
                                <Text style={styles.quickActionIcon}>📄</Text>
                                <Text style={styles.quickActionText}>Export PDF</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Upcoming Reminders */}
                    <View style={styles.remindersSection}>
                        <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
                        <View style={styles.reminderCard}>
                            <Text style={styles.reminderTitle}>Next Assignment</Text>
                            <Text style={styles.reminderText}>
                                {filteredSchedule[0]?.date} - {filteredSchedule[0]?.role} at {filteredSchedule[0]?.ministry}
                            </Text>
                            <Text style={styles.reminderTime}>
                                {filteredSchedule[0]?.time}
                            </Text>
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
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 15,
    },
    monthScrollView: {
        marginBottom: 10,
    },
    monthContainer: {
        flexDirection: 'row',
        paddingHorizontal: 5,
    },
    monthButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        marginRight: 10,
        alignItems: 'center',
    },
    monthButtonActive: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    monthButtonText: {
        color: '#7C3AED',
        fontSize: 14,
        fontWeight: '500',
    },
    monthButtonTextActive: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    filterContainer: {
        flexDirection: 'row',
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
    filterTabActive: {
        backgroundColor: '#8B5CF6',
    },
    filterTabText: {
        fontSize: 14,
        color: '#7C3AED',
        fontWeight: '500',
    },
    filterTabTextActive: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    summarySection: {
        marginBottom: 30,
    },
    summaryCards: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryCard: {
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
    summaryNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#8B5CF6',
        marginBottom: 5,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#7C3AED',
        textAlign: 'center',
    },
    scheduleSection: {
        marginBottom: 30,
    },
    assignmentCard: {
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
    loadingCard: {
        backgroundColor: '#FFFFFF',
        padding: 30,
        borderRadius: 16,
        marginBottom: 15,
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
    noAssignmentsCard: {
        backgroundColor: '#FFFFFF',
        padding: 30,
        borderRadius: 16,
        marginBottom: 15,
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
    noAssignmentsText: {
        fontSize: 16,
        color: '#7C3AED',
        fontWeight: '500',
        textAlign: 'center',
    },
    assignmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    assignmentInfo: {
        flex: 1,
    },
    assignmentDate: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#581C87',
        marginBottom: 5,
    },
    assignmentTime: {
        fontSize: 16,
        color: '#7C3AED',
        fontWeight: '500',
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
    assignmentDetails: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
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
    assignmentActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    requestChangeButton: {
        backgroundColor: 'transparent',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F59E0B',
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    requestChangeText: {
        color: '#F59E0B',
        fontSize: 14,
        fontWeight: '600',
    },
    viewDetailsButton: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    viewDetailsText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    quickActionsSection: {
        marginBottom: 30,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    quickActionButton: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        width: '48%',
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
    quickActionIcon: {
        fontSize: 32,
        marginBottom: 10,
    },
    quickActionText: {
        fontSize: 14,
        color: '#7C3AED',
        fontWeight: '500',
        textAlign: 'center',
    },
    remindersSection: {
        marginBottom: 30,
    },
    reminderCard: {
        backgroundColor: '#F3E8FF',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E9D5FF',
    },
    reminderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#581C87',
        marginBottom: 10,
    },
    reminderText: {
        fontSize: 16,
        color: '#7C3AED',
        marginBottom: 8,
        lineHeight: 22,
    },
    reminderTime: {
        fontSize: 14,
        color: '#7C3AED',
        fontStyle: 'italic',
    },
    debugContainer: {
        backgroundColor: '#FEF3C7',
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
        padding: 12,
        margin: 16,
        borderRadius: 8,
    },
    debugTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#92400E',
        marginBottom: 8,
    },
    debugText: {
        fontSize: 12,
        color: '#92400E',
        lineHeight: 16,
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

export default ViewMySchedule;
