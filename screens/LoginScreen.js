import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import storage from '../utils/storage';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        // Simple validation
        if (!email) {
            if (Platform.OS === 'web') {
                window.alert('Please enter your email or team member ID');
            } else {
                Alert.alert('Error', 'Please enter your email or team member ID');
            }
            return;
        }

        try {
            // Check if it's a team member ID (starts with TM)
            if (email.toUpperCase().startsWith('TM')) {
                // Team member login - no password required
                const teamMember = await validateTeamMember(email.toUpperCase());
                if (teamMember) {
                    // Store logged-in member info for use in other screens
                    await storeLoggedInMember(teamMember);
                    navigation.navigate('TeamDashboard');
                } else {
                    if (Platform.OS === 'web') {
                        window.alert('Invalid Team Member ID');
                    } else {
                        Alert.alert('Error', 'Invalid Team Member ID');
                    }
                }
            } else if (email.includes('admin') || email.includes('leader')) {
                // Admin login (email-based) - password still required
                if (!password) {
                    if (Platform.OS === 'web') {
                        window.alert('Password required for admin login');
                    } else {
                        Alert.alert('Error', 'Password required for admin login');
                    }
                    return;
                }
                navigation.navigate('AdminDashboard');
            } else {
                if (Platform.OS === 'web') {
                    window.alert('Invalid login credentials');
                } else {
                    Alert.alert('Error', 'Invalid login credentials');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            if (Platform.OS === 'web') {
                window.alert('Login failed. Please try again.');
            } else {
                Alert.alert('Error', 'Login failed. Please try again.');
            }
        }
    };

    // Validate team member ID
    const validateTeamMember = async (teamMemberId) => {
        try {
            const fileName = 'team_members.json';
            const fileUri = storage.getDocumentDirectory() + fileName;

            const fileContent = await storage.readAsStringAsync(fileUri);
            const teamData = JSON.parse(fileContent);

            // Find team member by ID
            const member = teamData.members.find(m =>
                m.teamMemberId === teamMemberId && m.status === 'Active'
            );
            return member;
        } catch (error) {
            console.error('Error validating team member:', error);
            return null;
        }
    };

    // Store logged-in member info
    const storeLoggedInMember = async (member) => {
        try {
            const memberData = {
                id: member.id,
                teamMemberId: member.teamMemberId,
                name: member.name,
                email: member.email,
                roles: member.roles,
                loginTime: new Date().toISOString()
            };

            const fileUri = storage.getDocumentDirectory() + 'current_user.json';
            await storage.writeAsStringAsync(fileUri, JSON.stringify(memberData));
        } catch (error) {
            console.error('Error storing logged-in member:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#8B5CF6', '#A855F7', '#C084FC']}
                style={styles.header}
            >
                <Text style={styles.logo}>⛪</Text>
                <Text style={styles.appName}>Pastoral Team Scheduler</Text>
                <Text style={styles.tagline}>Pastoral Team Management</Text>
            </LinearGradient>

            <View style={styles.loginContainer}>
                <Text style={styles.loginTitle}>Welcome Back</Text>
                <Text style={styles.loginSubtitle}>Sign in to access your schedule</Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Email or Team Member ID (e.g., TM001)"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                    />
                    <Text style={styles.inputHint}>
                        Admins: Use your email{'\n'}
                        Team Members: Use your ID (e.g., TM001) - No password needed!
                    </Text>
                </View>

                {!email.toUpperCase().startsWith('TM') && (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Password (Admin only)"
                            placeholderTextColor="#9CA3AF"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>
                )}

                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                    <LinearGradient
                        colors={['#8B5CF6', '#A855F7']}
                        style={styles.gradientButton}
                    >
                        <Text style={styles.loginButtonText}>Sign In</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.demoInfo}>
                    <Text style={styles.demoText}>Demo Login:</Text>
                    <Text style={styles.demoText}>• Admin: any email with "admin" or "leader"</Text>
                    <Text style={styles.demoText}>• Team Member: any other email</Text>
                </View>
            </View>
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
    loginContainer: {
        flex: 1,
        paddingHorizontal: 30,
        paddingTop: 40,
    },
    loginTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#581C87',
        textAlign: 'center',
        marginBottom: 10,
    },
    loginSubtitle: {
        fontSize: 16,
        color: '#7C3AED',
        textAlign: 'center',
        marginBottom: 40,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputHint: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 5,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        color: '#1F2937',
    },
    loginButton: {
        marginTop: 20,
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
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    demoInfo: {
        marginTop: 40,
        padding: 20,
        backgroundColor: '#F3E8FF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E9D5FF',
    },
    demoText: {
        fontSize: 14,
        color: '#7C3AED',
        marginBottom: 5,
        textAlign: 'center',
    },
});

export default LoginScreen;