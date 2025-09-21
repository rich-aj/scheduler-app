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

const ViewSchedule = ({ navigation }) => {
    const [selectedMonth, setSelectedMonth] = useState('All Months');
    const [selectedMinistry, setSelectedMinistry] = useState('All Ministries');
    const [scheduleData, setScheduleData] = useState([]);
    const [availableMonths, setAvailableMonths] = useState(['All Months']);
    const [availableMinistries, setAvailableMinistries] = useState(['All Ministries']);
    const [loading, setLoading] = useState(true);

    // Load all published schedules from JSON files
    const loadPublishedSchedules = async () => {
        try {
            setLoading(true);
            console.log('Loading published schedules...');

            const documentDir = storage.getDocumentDirectory();
            console.log('Document directory:', documentDir);

            const files = await storage.readDirectoryAsync(documentDir);
            console.log('All files in directory:', files);

            const scheduleFiles = files.filter(file => file.includes('schedule_') && file.endsWith('.json'));
            console.log('Schedule files found:', scheduleFiles);

            const allSchedules = [];
            const months = new Set(['All Months']);
            const ministries = new Set(['All Ministries']);

            // Add all default ministries to the filter (even if not published yet)
            const defaultMinistries = [
                'Sunday Service - 9:30 AM',
                'Sunday Service - 11:30 AM',
                'Sunday Service - 1:30 PM',
                'Thursday Service',
                'Friday Night Prayer',
                'Hour Of Meditation'
            ];

            defaultMinistries.forEach(ministry => ministries.add(ministry));

            for (const file of scheduleFiles) {
                try {
                    // Convert the file name back to the proper file URI format
                    const fileName = file.replace('church-scheduler-', '');
                    const fileUri = documentDir + fileName;
                    console.log('Reading file:', fileUri, 'from localStorage key:', file);

                    const fileContent = await storage.readAsStringAsync(fileUri);
                    console.log('File content:', fileContent);

                    const schedule = JSON.parse(fileContent);
                    console.log('Parsed schedule:', schedule);

                    allSchedules.push(schedule);
                    months.add(schedule.month);
                    ministries.add(schedule.ministry);
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                }
            }

            console.log('Final schedules loaded:', allSchedules);
            console.log('Available months:', Array.from(months));
            console.log('Available ministries:', Array.from(ministries));

            setScheduleData(allSchedules);
            setAvailableMonths(Array.from(months).sort());
            setAvailableMinistries(Array.from(ministries).sort());

        } catch (error) {
            console.error('Error loading schedules:', error);
            if (Platform.OS === 'web') {
                window.alert(`Error loading schedules: ${error.message}`);
            } else {
                Alert.alert('Error', 'Failed to load published schedules');
            }
        } finally {
            setLoading(false);
        }
    };

    // Load schedules when component mounts
    useEffect(() => {
        loadPublishedSchedules();
    }, []);

    // Filter schedules based on selected month and ministry
    const getFilteredSchedules = () => {
        return scheduleData.filter(schedule => {
            const monthMatch = selectedMonth === 'All Months' || schedule.month === selectedMonth;
            const ministryMatch = selectedMinistry === 'All Ministries' || schedule.ministry === selectedMinistry;
            return monthMatch && ministryMatch;
        });
    };

    // Convert schedule data to display format
    const getDisplaySchedules = () => {
        const filtered = getFilteredSchedules();
        const displayData = [];

        filtered.forEach(schedule => {
            // Handle both 'sundays' (old format) and 'dates' (new format)
            const dateArray = schedule.sundays || schedule.dates;
            if (dateArray && Array.isArray(dateArray)) {
                dateArray.forEach(dateInfo => {
                    // Determine time based on ministry
                    let time = '9:00 AM'; // Default
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

                    displayData.push({
                        date: dateInfo.date,
                        time: time,
                        ministry: schedule.ministry,
                        month: schedule.month,
                        assignments: dateInfo.assignments.map(assignment => ({
                            role: assignment.role,
                            member: assignment.assignedTo,
                            status: assignment.status === 'confirmed' ? 'Confirmed' : 'Pending'
                        }))
                    });
                });
            }
        });

        return displayData.sort((a, b) => new Date(a.date) - new Date(b.date));
    };


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

    const filteredSchedule = getDisplaySchedules();

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
                <Text style={styles.appName}>View Team Schedule</Text>
                <Text style={styles.tagline}>Current month's assignments</Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={loadPublishedSchedules}
                >
                    <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
                </TouchableOpacity>
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
                            <Text style={styles.loadingText}>Loading published schedules...</Text>
                        </View>
                    )}

                    {/* No Data State */}
                    {!loading && scheduleData.length === 0 && (
                        <View style={styles.noDataContainer}>
                            <Text style={styles.noDataTitle}>No Published Schedules</Text>
                            <Text style={styles.noDataText}>
                                No published schedules found. Create and publish a schedule first.
                            </Text>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={loadPublishedSchedules}
                            >
                                <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* No Schedules for Selected Ministry */}
                    {!loading && scheduleData.length > 0 && filteredSchedule.length === 0 && selectedMinistry !== 'All Ministries' && (
                        <View style={styles.noDataContainer}>
                            <Text style={styles.noDataTitle}>No Schedules for {selectedMinistry}</Text>
                            <Text style={styles.noDataText}>
                                No published schedules found for "{selectedMinistry}".
                                Create and publish a schedule for this ministry first.
                            </Text>
                            <TouchableOpacity
                                style={styles.createScheduleButton}
                                onPress={() => navigation.navigate('CreateSchedule')}
                            >
                                <Text style={styles.createScheduleButtonText}>📅 Create Schedule</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {/* Main Content - Only show when there's data */}
                    {!loading && scheduleData.length > 0 && (
                        <>
                            {/* Month Selection */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Select Month</Text>
                                <View style={styles.monthContainer}>
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
                                </View>
                            </View>

                            {/* Ministry Filter */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Filter by Ministry</Text>
                                <View style={styles.ministryContainer}>
                                    {availableMinistries.map((ministry, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.ministryButton,
                                                selectedMinistry === ministry && styles.ministryButtonActive
                                            ]}
                                            onPress={() => setSelectedMinistry(ministry)}
                                        >
                                            <Text style={[
                                                styles.ministryButtonText,
                                                selectedMinistry === ministry && styles.ministryButtonTextActive
                                            ]}>
                                                {ministry}
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
                                        <Text style={styles.summaryNumber}>{filteredSchedule.length}</Text>
                                        <Text style={styles.summaryLabel}>Services</Text>
                                    </View>
                                    <View style={styles.summaryCard}>
                                        <Text style={styles.summaryNumber}>
                                            {filteredSchedule.reduce((total, service) => total + service.assignments.length, 0)}
                                        </Text>
                                        <Text style={styles.summaryLabel}>Assignments</Text>
                                    </View>
                                    <View style={styles.summaryCard}>
                                        <Text style={styles.summaryNumber}>
                                            {filteredSchedule.reduce((total, service) =>
                                                total + service.assignments.filter(a => a.status === 'Confirmed').length, 0
                                            )}
                                        </Text>
                                        <Text style={styles.summaryLabel}>Confirmed</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Schedule List */}
                            <View style={styles.scheduleSection}>
                                <Text style={styles.sectionTitle}>Detailed Schedule</Text>
                                {filteredSchedule.map((service, index) => (
                                    <View key={index} style={styles.serviceCard}>
                                        <View style={styles.serviceHeader}>
                                            <View style={styles.serviceInfo}>
                                                <Text style={styles.serviceDate}>{service.date}</Text>
                                                <Text style={styles.serviceTime}>{service.time}</Text>
                                            </View>
                                            <View style={styles.ministryBadge}>
                                                <Text style={styles.ministryBadgeText}>{service.ministry}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.assignmentsContainer}>
                                            {service.assignments.map((assignment, assignmentIndex) => (
                                                <View key={assignmentIndex} style={styles.assignmentRow}>
                                                    <View style={styles.assignmentInfo}>
                                                        <Text style={styles.roleText}>{assignment.role}</Text>
                                                        <Text style={styles.memberText}>{assignment.member}</Text>
                                                    </View>
                                                    <View style={styles.statusContainer}>
                                                        <Text style={styles.statusIcon}>{getStatusIcon(assignment.status)}</Text>
                                                        <Text style={[styles.statusText, { color: getStatusColor(assignment.status) }]}>
                                                            {assignment.status}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>

                                        <View style={styles.serviceActions}>
                                            <TouchableOpacity
                                                style={styles.editButton}
                                                onPress={() => Alert.alert('Edit', `Edit schedule for ${service.date}`)}
                                            >
                                                <Text style={styles.editButtonText}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.notifyButton}
                                                onPress={() => Alert.alert('Notify', `Send reminders for ${service.date}`)}
                                            >
                                                <Text style={styles.notifyButtonText}>Send Reminders</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Export Options */}
                            <View style={styles.exportSection}>
                                <Text style={styles.sectionTitle}>Export Schedule</Text>
                                <View style={styles.exportButtons}>
                                    <TouchableOpacity
                                        style={styles.exportButton}
                                        onPress={() => Alert.alert('Export', 'Export as PDF')}
                                    >
                                        <Text style={styles.exportButtonText}>Export as PDF</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.exportButton}
                                        onPress={() => Alert.alert('Export', 'Export as Excel')}
                                    >
                                        <Text style={styles.exportButtonText}>Export as Excel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.exportButton}
                                        onPress={() => Alert.alert('Share', 'Share via email')}
                                    >
                                        <Text style={styles.exportButtonText}>Share via Email</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}
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
        marginBottom: 10,
    },
    refreshButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    refreshButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
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
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 15,
    },
    monthContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    monthButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        flex: 1,
        marginHorizontal: 5,
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
    ministryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    ministryButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        marginBottom: 10,
        width: '48%',
        alignItems: 'center',
    },
    ministryButtonActive: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    ministryButtonText: {
        color: '#7C3AED',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    ministryButtonTextActive: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
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
    serviceCard: {
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
    serviceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    serviceInfo: {
        flex: 1,
    },
    serviceDate: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#581C87',
        marginBottom: 5,
    },
    serviceTime: {
        fontSize: 16,
        color: '#7C3AED',
        fontWeight: '500',
    },
    ministryBadge: {
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E9D5FF',
    },
    ministryBadgeText: {
        color: '#7C3AED',
        fontSize: 12,
        fontWeight: '600',
    },
    assignmentsContainer: {
        marginBottom: 20,
    },
    assignmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3E8FF',
    },
    assignmentInfo: {
        flex: 1,
    },
    roleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 3,
    },
    memberText: {
        fontSize: 14,
        color: '#7C3AED',
    },
    statusContainer: {
        alignItems: 'center',
    },
    statusIcon: {
        fontSize: 18,
        marginBottom: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    serviceActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    editButton: {
        backgroundColor: 'transparent',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#8B5CF6',
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    editButtonText: {
        color: '#8B5CF6',
        fontSize: 14,
        fontWeight: '600',
    },
    notifyButton: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    notifyButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    exportSection: {
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
    noDataContainer: {
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
    noDataTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 10,
    },
    noDataText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24,
    },
    refreshButton: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    refreshButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    createScheduleButton: {
        backgroundColor: '#10B981',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 10,
    },
    createScheduleButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    exportButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    exportButton: {
        backgroundColor: '#F3E8FF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        marginBottom: 10,
        width: '48%',
        alignItems: 'center',
    },
    exportButtonText: {
        color: '#7C3AED',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default ViewSchedule;
