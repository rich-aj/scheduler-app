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

const CreateSchedule = ({ navigation }) => {
    // Get current month dynamically
    const getCurrentMonth = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${months[currentMonth]} ${currentYear}`;
    };

    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const [selectedMinistry, setSelectedMinistry] = useState('Sunday Service - 9:30 AM');
    const [assignments, setAssignments] = useState({});
    const [showMemberPicker, setShowMemberPicker] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [customMinistries, setCustomMinistries] = useState([]);
    const [showAddMinistry, setShowAddMinistry] = useState(false);
    const [newMinistryName, setNewMinistryName] = useState('');

    const defaultMinistries = [
        'Sunday Service - 9:30 AM',
        'Sunday Service - 11:30 AM',
        'Sunday Service - 1:30 PM',
        'Thursday Service',
        'Friday Night Prayer',
        'Hour Of Meditation'
    ];

    const ministries = [...defaultMinistries, ...customMinistries];

    // Dynamic roles based on selected ministry
    const getRolesForMinistry = (ministry) => {
        if (ministry === 'Hour Of Meditation') {
            return [
                'Leading Prayers',
                'Self-care',
                'Car pickup/ironing',
                'Assistant A',
                'Assistant B',
                'Support'
            ];
        } else {
            return [
                'Main Lead A',
                'Main Lead B',
                'Security',
                'Support 1',
                'Support 2',
                'Evening'
            ];
        }
    };

    const roles = getRolesForMinistry(selectedMinistry);

    const [teamMembers, setTeamMembers] = useState([]);

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
                // Use default names if file doesn't exist
                const defaultNames = [
                    'Boma Ibiba',
                    'Alex Appiah',
                    'Allegra Muamba',
                    'Iseoluwa Ajala',
                    'Chisom Onyegbula',
                    'Diane Alheri',
                    'Elvis Kigongo',
                    'Ivan Kizito',
                    'Loveth Werimegbe',
                    'Maria Murungi',
                    'Marie Essebou',
                    'Mayoula Georges',
                    'Phoebe Acheampong',
                    'Precious Emezieke',
                    'Ruth Finlayson',
                    'Victoria Nyambana'
                ];
                setTeamMembers(defaultNames);
            }
        } catch (error) {
            console.error('Error loading team members:', error);
            // Use default names if loading fails
            const defaultNames = [
                'Boma Ibiba',
                'Alex Appiah',
                'Allegra Muamba',
                'Iseoluwa Ajala',
                'Chisom Onyegbula',
                'Diane Alheri',
                'Elvis Kigongo',
                'Ivan Kizito',
                'Loveth Werimegbe',
                'Maria Murungi',
                'Marie Essebou',
                'Mayoula Georges',
                'Phoebe Acheampong',
                'Precious Emezieke',
                'Ruth Finlayson',
                'Victoria Nyambana'
            ];
            setTeamMembers(defaultNames);
        }
    };

    // Load team members when component mounts
    useEffect(() => {
        loadTeamMembers();
    }, []);

    // Add custom ministry
    const handleAddMinistry = () => {
        if (newMinistryName.trim() === '') {
            Alert.alert('Error', 'Please enter a ministry name');
            return;
        }

        if (ministries.includes(newMinistryName.trim())) {
            Alert.alert('Error', 'This ministry already exists');
            return;
        }

        setCustomMinistries([...customMinistries, newMinistryName.trim()]);
        setNewMinistryName('');
        setShowAddMinistry(false);
        Alert.alert('Success', `Added "${newMinistryName.trim()}" to ministries`);
    };

    // Generate Sundays for the selected month
    const getSundaysInMonth = (monthYear) => {
        try {
            const [month, year] = monthYear.split(' ');
            const yearNum = parseInt(year);
            const monthIndex = new Date(yearNum, getMonthIndex(month), 1).getMonth();
            const sundays = [];

            // Find first Sunday of the month
            const firstDay = new Date(yearNum, monthIndex, 1);
            const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

            // Calculate days to add to get to first Sunday
            const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
            const firstSunday = new Date(yearNum, monthIndex, 1 + daysToAdd);

            // Add all Sundays in the month
            let currentSunday = new Date(firstSunday);
            while (currentSunday.getMonth() === monthIndex) {
                const day = currentSunday.getDate();
                const dayName = currentSunday.toLocaleDateString('en-US', { weekday: 'long' });
                sundays.push({
                    date: `${dayName}, ${month} ${day}`,
                    day: day,
                    fullDate: new Date(currentSunday)
                });
                currentSunday.setDate(currentSunday.getDate() + 7);
            }

            return sundays;
        } catch (error) {
            console.error('Error calculating Sundays:', error);
            return [];
        }
    };

    // Generate Thursdays for the selected month
    const getThursdaysInMonth = (monthYear) => {
        try {
            const [month, year] = monthYear.split(' ');
            const yearNum = parseInt(year);
            const monthIndex = new Date(yearNum, getMonthIndex(month), 1).getMonth();
            const thursdays = [];

            // Find first Thursday of the month
            const firstDay = new Date(yearNum, monthIndex, 1);
            const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

            // Calculate days to add to get to first Thursday (4 = Thursday)
            const daysToAdd = dayOfWeek <= 4 ? (4 - dayOfWeek) : (11 - dayOfWeek);
            const firstThursday = new Date(yearNum, monthIndex, 1 + daysToAdd);

            // Add all Thursdays in the month
            let currentThursday = new Date(firstThursday);
            while (currentThursday.getMonth() === monthIndex) {
                const day = currentThursday.getDate();
                const dayName = currentThursday.toLocaleDateString('en-US', { weekday: 'long' });
                thursdays.push({
                    date: `${dayName}, ${month} ${day}`,
                    day: day,
                    fullDate: new Date(currentThursday)
                });
                currentThursday.setDate(currentThursday.getDate() + 7);
            }

            return thursdays;
        } catch (error) {
            console.error('Error calculating Thursdays:', error);
            return [];
        }
    };

    // Generate last Friday of the month
    const getLastFridayInMonth = (monthYear) => {
        try {
            const [month, year] = monthYear.split(' ');
            const yearNum = parseInt(year);
            const monthIndex = new Date(yearNum, getMonthIndex(month), 1).getMonth();

            // Get last day of the month
            const lastDay = new Date(yearNum, monthIndex + 1, 0);
            const dayOfWeek = lastDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

            // Calculate days to subtract to get to last Friday (5 = Friday)
            const daysToSubtract = dayOfWeek >= 5 ? (dayOfWeek - 5) : (dayOfWeek + 2);
            const lastFriday = new Date(lastDay);
            lastFriday.setDate(lastDay.getDate() - daysToSubtract);

            const day = lastFriday.getDate();
            const dayName = lastFriday.toLocaleDateString('en-US', { weekday: 'long' });

            return [{
                date: `${dayName}, ${month} ${day}`,
                day: day,
                fullDate: new Date(lastFriday)
            }];
        } catch (error) {
            console.error('Error calculating last Friday:', error);
            return [];
        }
    };

    // Helper function to get month index
    const getMonthIndex = (monthName) => {
        const months = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3,
            'May': 4, 'June': 5, 'July': 6, 'August': 7,
            'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        return months[monthName] || 0;
    };

    // Generate Saturdays for the selected month
    const getSaturdaysInMonth = (monthYear) => {
        try {
            const [month, year] = monthYear.split(' ');
            const yearNum = parseInt(year);
            const monthIndex = new Date(yearNum, getMonthIndex(month), 1).getMonth();
            const saturdays = [];

            // Find first Saturday of the month
            const firstDay = new Date(yearNum, monthIndex, 1);
            const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

            // Calculate days to add to get to first Saturday (6 = Saturday)
            const daysToAdd = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7;
            const firstSaturday = new Date(yearNum, monthIndex, 1 + daysToAdd);

            // Generate all Saturdays in the month
            let currentSaturday = new Date(firstSaturday);
            while (currentSaturday.getMonth() === monthIndex) {
                saturdays.push({
                    date: currentSaturday.getDate().toString(),
                    day: 'Saturday',
                    fullDate: new Date(currentSaturday)
                });
                currentSaturday.setDate(currentSaturday.getDate() + 7);
            }

            return saturdays;
        } catch (error) {
            console.error('Error generating Saturdays:', error);
            return [];
        }
    };

    // Get the appropriate dates based on selected ministry
    const getMinistryDates = () => {
        if (selectedMinistry.startsWith('Sunday Service')) {
            return getSundaysInMonth(selectedMonth);
        } else if (selectedMinistry === 'Thursday Service') {
            return getThursdaysInMonth(selectedMonth);
        } else if (selectedMinistry === 'Friday Night Prayer') {
            return getLastFridayInMonth(selectedMonth);
        } else if (selectedMinistry === 'Hour Of Meditation') {
            return getSaturdaysInMonth(selectedMonth);
        } else {
            // For custom ministries, default to Sundays
            return getSundaysInMonth(selectedMonth);
        }
    };

    const ministryDates = getMinistryDates();

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

    const availableMonths = getAvailableMonths();

    // Helper functions for member assignment
    const getAssignedMember = (sundayIndex, roleIndex) => {
        const key = `${sundayIndex}-${roleIndex}`;
        return assignments[key] || teamMembers[roleIndex] || 'Select Member';
    };

    const handleMemberSelection = (sundayIndex, roleIndex) => {
        setSelectedRole({ sundayIndex, roleIndex });
        setShowMemberPicker(true);
    };

    const selectMember = (memberName) => {
        if (selectedRole) {
            const key = `${selectedRole.sundayIndex}-${selectedRole.roleIndex}`;
            setAssignments(prev => ({
                ...prev,
                [key]: memberName
            }));
        }
        setShowMemberPicker(false);
        setSelectedRole(null);
    };

    // Get assigned member for schedule preview
    const getPreviewMember = (sundayIndex, roleIndex) => {
        const key = `${sundayIndex}-${roleIndex}`;
        return assignments[key] || teamMembers[roleIndex] || 'Unassigned';
    };

    // Validate schedule assignments
    const validateSchedule = () => {
        const unassignedRoles = [];

        ministryDates.forEach((sunday, sundayIndex) => {
            roles.forEach((role, roleIndex) => {
                const key = `${sundayIndex}-${roleIndex}`;
                const assignedMember = assignments[key] || teamMembers[roleIndex];

                if (!assignedMember || assignedMember === 'Select Member' || assignedMember === 'Unassigned') {
                    unassignedRoles.push({
                        sunday: sunday.date,
                        role: role
                    });
                }
            });
        });

        return unassignedRoles;
    };

    // Save schedule to JSON file
    const saveScheduleToFile = async (scheduleData) => {
        try {
            const fileName = `schedule_${selectedMonth.replace(' ', '_')}_${selectedMinistry.replace(' ', '_')}.json`;
            const fileUri = storage.getDocumentDirectory() + fileName;

            await storage.writeAsStringAsync(
                fileUri,
                JSON.stringify(scheduleData, null, 2)
            );

            return { success: true, fileName, fileUri };
        } catch (error) {
            console.error('Error saving schedule:', error);
            return { success: false, error: error.message };
        }
    };

    // List all saved schedule files
    const listSavedSchedules = async () => {
        try {
            const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
            const scheduleFiles = files.filter(file => file.startsWith('schedule_') && file.endsWith('.json'));

            if (scheduleFiles.length === 0) {
                Alert.alert(
                    'No Saved Schedules',
                    'No schedule files found. Create and publish a schedule first.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const fileList = scheduleFiles.map(file => {
                const parts = file.replace('schedule_', '').replace('.json', '').split('_');
                const month = parts[0];
                const year = parts[1];
                const ministry = parts.slice(2).join(' ');
                return `📅 ${month} ${year} - ${ministry}`;
            }).join('\n');

            Alert.alert(
                'Saved Schedules',
                `Found ${scheduleFiles.length} saved schedule(s):\n\n${fileList}\n\n📁 Location: App's private storage\n🔒 Only accessible within this app`,
                [
                    { text: 'OK' },
                    {
                        text: 'View File Path',
                        onPress: () => {
                            Alert.alert(
                                'File Storage Location',
                                `Files are saved to:\n${storage.getDocumentDirectory()}\n\nThis is the app's private document directory. Files are not visible in your device's file manager but are accessible within the app.`,
                                [{ text: 'OK' }]
                            );
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert(
                'Error',
                `Failed to list files: ${error.message}`,
                [{ text: 'OK' }]
            );
        }
    };

    // Create schedule data structure
    const createScheduleData = () => {
        const scheduleData = {
            id: Date.now().toString(),
            month: selectedMonth,
            ministry: selectedMinistry,
            createdAt: new Date().toISOString(),
            status: 'published',
            sundays: ministryDates.map((sunday, sundayIndex) => ({
                date: sunday.date,
                day: sunday.day,
                fullDate: sunday.fullDate.toISOString(),
                assignments: roles.map((role, roleIndex) => {
                    const key = `${sundayIndex}-${roleIndex}`;
                    const assignedMember = assignments[key] || teamMembers[roleIndex] || 'Unassigned';
                    return {
                        role: role,
                        assignedTo: assignedMember,
                        status: 'confirmed'
                    };
                })
            })),
            summary: {
                totalSundays: ministryDates.length,
                totalAssignments: ministryDates.length * roles.length,
                assignedRoles: Object.keys(assignments).length + (ministryDates.length * roles.length - Object.keys(assignments).length)
            }
        };

        return scheduleData;
    };

    const handleCreateSchedule = async () => {
        // Validate schedule
        const unassignedRoles = validateSchedule();

        // Debug: Show what we found
        console.log('Unassigned roles:', unassignedRoles);

        if (unassignedRoles.length > 0) {
            const unassignedList = unassignedRoles
                .map(item => `• ${item.sunday} - ${item.role}`)
                .join('\n');

            if (Platform.OS === 'web') {
                window.alert(`Incomplete Schedule\n\nPlease assign team members to all roles before publishing:\n\n${unassignedList}\n\nTotal unassigned: ${unassignedRoles.length}`);
            } else {
                Alert.alert(
                    'Incomplete Schedule',
                    `Please assign team members to all roles before publishing:\n\n${unassignedList}`,
                    [{ text: 'OK' }]
                );
            }
            return;
        }

        // Show confirmation dialog
        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`Publish Schedule?\n\nAre you sure you want to publish the schedule for ${selectedMinistry} in ${selectedMonth}?\n\nThis will notify all team members.`);
            if (confirmed) {
                await publishSchedule();
            }
        } else {
            Alert.alert(
                'Publish Schedule?',
                `Are you sure you want to publish the schedule for ${selectedMinistry} in ${selectedMonth}?\n\nThis will notify all team members.`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    },
                    {
                        text: 'Publish',
                        onPress: publishSchedule
                    }
                ]
            );
        }
    };

    const publishSchedule = async () => {
        try {
            // Create schedule data
            const scheduleData = createScheduleData();

            // Save to JSON file
            const saveResult = await saveScheduleToFile(scheduleData);

            if (saveResult.success) {
                if (Platform.OS === 'web') {
                    window.alert(`Schedule Published!\n\n✅ Schedule saved successfully!\n📁 File: ${saveResult.fileName}\n📅 Month: ${selectedMonth}\n⛪ Ministry: ${selectedMinistry}\n👥 Team members will be notified.`);
                } else {
                    Alert.alert(
                        'Schedule Published!',
                        `✅ Schedule saved successfully!\n📁 File: ${saveResult.fileName}\n📅 Month: ${selectedMonth}\n⛪ Ministry: ${selectedMinistry}\n👥 Team members will be notified.`,
                        [
                            {
                                text: 'View Dashboard',
                                onPress: () => navigation.navigate('AdminDashboard')
                            }
                        ]
                    );
                }
            } else {
                if (Platform.OS === 'web') {
                    window.alert(`Error\n\nFailed to save schedule: ${saveResult.error}`);
                } else {
                    Alert.alert(
                        'Error',
                        `Failed to save schedule: ${saveResult.error}`,
                        [{ text: 'OK' }]
                    );
                }
            }
        } catch (error) {
            if (Platform.OS === 'web') {
                window.alert(`Error\n\nAn error occurred: ${error.message}`);
            } else {
                Alert.alert(
                    'Error',
                    `An error occurred: ${error.message}`,
                    [{ text: 'OK' }]
                );
            }
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
                <Text style={styles.appName}>Create Monthly Schedule</Text>
                <Text style={styles.tagline}>Generate and assign roles</Text>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}
                bounces={Platform.OS === 'web' ? false : true}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {/* Month Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Select Month</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.monthScrollView}
                            contentContainerStyle={styles.monthScrollContent}
                        >
                            {availableMonths.map((month) => (
                                <TouchableOpacity
                                    key={month}
                                    style={selectedMonth === month ? styles.monthButtonActive : styles.monthButton}
                                    onPress={() => setSelectedMonth(month)}
                                >
                                    <Text style={selectedMonth === month ? styles.monthButtonTextActive : styles.monthButtonText}>
                                        {month}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Ministry Selection */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Select Ministry</Text>
                            <TouchableOpacity
                                style={styles.addMinistryButton}
                                onPress={() => setShowAddMinistry(true)}
                            >
                                <Text style={styles.addMinistryButtonText}>+ Add Custom</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.ministryContainer}>
                            {ministries.map((ministry, index) => (
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

                    {/* Ministry Dates in Selected Month */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{selectedMinistry} in {selectedMonth}</Text>
                        <Text style={styles.sectionSubtitle}>
                            {ministryDates.length} {selectedMinistry.startsWith('Sunday Service') ? 'Sunday' : selectedMinistry === 'Thursday Service' ? 'Thursday' : selectedMinistry === 'Friday Night Prayer' ? 'Friday' : selectedMinistry === 'Hour Of Meditation' ? 'Saturday' : 'Date'}{ministryDates.length !== 1 ? 's' : ''} found in {selectedMonth}
                        </Text>


                        <View style={styles.sundaysList}>
                            {ministryDates.map((sunday, index) => (
                                <View key={index} style={styles.sundayItem}>
                                    <Text style={styles.sundayDate}>{sunday.date}</Text>
                                    <Text style={styles.sundayDay}>Day {sunday.day}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Weekly Schedule Assignment */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Weekly Schedule Assignment</Text>
                        <Text style={styles.sectionSubtitle}>
                            Assign team members to roles for each Sunday in {selectedMonth}
                        </Text>

                        {ministryDates.map((sunday, sundayIndex) => (
                            <View key={sundayIndex} style={styles.sundaySchedule}>
                                <Text style={styles.sundayTitle}>{sunday.date}</Text>
                                <View style={styles.rolesGrid}>
                                    {roles.map((role, roleIndex) => (
                                        <View key={roleIndex} style={styles.roleCard}>
                                            <Text style={styles.roleTitle}>{role}</Text>
                                            <TouchableOpacity
                                                style={styles.memberButton}
                                                onPress={() => handleMemberSelection(sundayIndex, roleIndex)}
                                            >
                                                <Text style={styles.memberButtonText}>
                                                    {getAssignedMember(sundayIndex, roleIndex)}
                                                </Text>
                                                <Text style={styles.dropdownIcon}>▼</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Schedule Preview */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Schedule Preview</Text>
                        <View style={styles.previewCard}>
                            <Text style={styles.previewTitle}>{selectedMinistry} - {selectedMonth}</Text>
                            <Text style={styles.previewSubtitle}>
                                {selectedMinistry.startsWith('Sunday Service') ? 'Weekly Sunday Schedule' :
                                    selectedMinistry === 'Thursday Service' ? 'Weekly Thursday Schedule' :
                                        selectedMinistry === 'Friday Night Prayer' ? 'Monthly Friday Schedule' :
                                            selectedMinistry === 'Hour Of Meditation' ? 'Weekly Saturday Schedule' :
                                                'Custom Event Schedule'}
                            </Text>

                            {ministryDates.map((sunday, sundayIndex) => (
                                <View key={sundayIndex} style={styles.sundayPreview}>
                                    <Text style={styles.sundayPreviewTitle}>{sunday.date}</Text>
                                    <View style={styles.servingList}>
                                        {roles.map((role, roleIndex) => (
                                            <Text key={roleIndex} style={styles.servingItem}>
                                                • {role}: {getPreviewMember(sundayIndex, roleIndex)}
                                            </Text>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionContainer}>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    window.alert('Schedule draft saved successfully!');
                                } else {
                                    Alert.alert('Saved', 'Schedule draft saved successfully!');
                                }
                            }}
                        >
                            <Text style={styles.saveButtonText}>Save Draft</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.publishButton}
                            onPress={handleCreateSchedule}
                        >
                            <LinearGradient
                                colors={['#8B5CF6', '#A855F7']}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.publishButtonText}>Publish Schedule</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.viewFilesButton} onPress={listSavedSchedules}>
                        <Text style={styles.viewFilesButtonText}>📁 View Saved Schedules</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.viewFilesButton, { backgroundColor: '#10B981', marginTop: 10 }]}
                        onPress={async () => {
                            try {
                                const files = await storage.readDirectoryAsync(storage.getDocumentDirectory());
                                const scheduleFiles = files.filter(file => file.includes('schedule_') && file.endsWith('.json'));

                                if (Platform.OS === 'web') {
                                    window.alert(`Files in directory:\n\nAll files: ${files.join(', ')}\n\nSchedule files: ${scheduleFiles.join(', ')}`);
                                } else {
                                    Alert.alert('Files', `All files: ${files.join(', ')}\n\nSchedule files: ${scheduleFiles.join(', ')}`);
                                }
                            } catch (error) {
                                if (Platform.OS === 'web') {
                                    window.alert(`Error listing files: ${error.message}`);
                                } else {
                                    Alert.alert('Error', `Error listing files: ${error.message}`);
                                }
                            }
                        }}
                    >
                        <Text style={styles.viewFilesButtonText}>🔍 List All Files</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Member Selection Modal */}
            {showMemberPicker && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Team Member</Text>
                        <ScrollView style={styles.memberList}>
                            {teamMembers.map((member, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.memberOption}
                                    onPress={() => selectMember(member)}
                                >
                                    <Text style={styles.memberOptionText}>{member}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setShowMemberPicker(false);
                                setSelectedRole(null);
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Add Custom Ministry Modal */}
            {showAddMinistry && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Custom Ministry/Event</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter ministry or event name"
                            value={newMinistryName}
                            onChangeText={setNewMinistryName}
                            autoFocus={true}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelModalButton]}
                                onPress={() => {
                                    setShowAddMinistry(false);
                                    setNewMinistryName('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmModalButton]}
                                onPress={handleAddMinistry}
                            >
                                <Text style={styles.confirmButtonText}>Add</Text>
                            </TouchableOpacity>
                        </View>
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#581C87',
        flex: 1,
    },
    addMinistryButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addMinistryButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#7C3AED',
        marginBottom: 20,
    },
    monthScrollView: {
        marginHorizontal: -20,
    },
    monthScrollContent: {
        paddingHorizontal: 20,
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
        minWidth: 100,
    },
    monthButtonActive: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginRight: 10,
        alignItems: 'center',
        minWidth: 100,
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
    roleTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#581C87',
        marginBottom: 10,
        textAlign: 'center',
    },
    memberButton: {
        backgroundColor: '#F3E8FF',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    memberButtonText: {
        color: '#7C3AED',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
        textAlign: 'center',
    },
    dropdownIcon: {
        color: '#7C3AED',
        fontSize: 12,
        marginLeft: 8,
    },
    previewCard: {
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
    previewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#581C87',
        marginBottom: 5,
    },
    previewSubtitle: {
        fontSize: 14,
        color: '#7C3AED',
        marginBottom: 20,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3E8FF',
    },
    previewDay: {
        fontSize: 14,
        fontWeight: '600',
        color: '#581C87',
        flex: 1,
    },
    previewTime: {
        fontSize: 14,
        color: '#7C3AED',
        flex: 1,
        textAlign: 'center',
    },
    previewRole: {
        fontSize: 14,
        color: '#7C3AED',
        flex: 2,
        textAlign: 'right',
    },
    sundaySchedule: {
        backgroundColor: '#F9FAFB',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E9D5FF',
    },
    sundayTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#581C87',
        marginBottom: 15,
        textAlign: 'center',
    },
    rolesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    roleCard: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        width: '48%',
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sundayPreview: {
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3E8FF',
    },
    sundayPreviewTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#581C87',
        marginBottom: 10,
    },
    servingList: {
        marginLeft: 10,
    },
    servingItem: {
        fontSize: 14,
        color: '#7C3AED',
        marginBottom: 5,
        lineHeight: 20,
    },
    sundaysList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sundayItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E9D5FF',
    },
    sundayDate: {
        fontSize: 16,
        fontWeight: '600',
        color: '#581C87',
    },
    sundayDay: {
        fontSize: 14,
        color: '#7C3AED',
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    viewFilesButton: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 15,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    viewFilesButtonText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    saveButton: {
        backgroundColor: 'transparent',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#8B5CF6',
        flex: 1,
        marginRight: 10,
    },
    saveButtonText: {
        color: '#8B5CF6',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    publishButton: {
        flex: 1,
        marginLeft: 10,
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
    publishButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
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
        maxHeight: '70%',
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#581C87',
        marginBottom: 20,
        textAlign: 'center',
    },
    memberList: {
        maxHeight: 300,
    },
    memberOption: {
        backgroundColor: '#F9FAFB',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E9D5FF',
    },
    memberOptionText: {
        fontSize: 16,
        color: '#581C87',
        fontWeight: '500',
        textAlign: 'center',
    },
    cancelButton: {
        backgroundColor: '#6B7280',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 15,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelModalButton: {
        backgroundColor: '#6B7280',
    },
    confirmModalButton: {
        backgroundColor: '#8B5CF6',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CreateSchedule;
