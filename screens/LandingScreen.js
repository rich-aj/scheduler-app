import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Image,
    Dimensions,
    ScrollView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const LandingScreen = ({ navigation }) => {
    return (
        <SafeAreaView style={styles.container}>
            {/* Header Section with Purple Gradient */}
            <LinearGradient
                colors={['#8B5CF6', '#A855F7', '#C084FC']}
                style={styles.header}
            >
                <Text style={styles.logo}>⛪</Text>
                <Text style={styles.appName}>Pastoral Team Scheduler</Text>
                <Text style={styles.tagline}>Organizing God's work together</Text>
            </LinearGradient>

            {/* Scrollable Main Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={Platform.OS === 'web' ? true : false}
                bounces={Platform.OS === 'web' ? false : true}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.heroSection}>
                    <Text style={styles.heroTitle}>Welcome to Pastoral Team Scheduler</Text>
                    <Text style={styles.heroSubtitle}>
                        Coordinate schedules, manage volunteers, and ensure every ministry runs smoothly
                    </Text>
                </View>

                {/* Feature Cards */}
                <View style={styles.featuresContainer}>
                    <LinearGradient
                        colors={['#F3E8FF', '#E9D5FF']}
                        style={styles.featureCard}
                    >
                        <Text style={styles.featureIcon}>📅</Text>
                        <Text style={styles.featureTitle}>Easy Scheduling</Text>
                        <Text style={styles.featureDescription}>
                            Create and manage schedules for all your ministries with just a few taps
                        </Text>
                    </LinearGradient>

                    <LinearGradient
                        colors={['#F3E8FF', '#E9D5FF']}
                        style={styles.featureCard}
                    >
                        <Text style={styles.featureIcon}>👥</Text>
                        <Text style={styles.featureTitle}>Team Management</Text>
                        <Text style={styles.featureDescription}>
                            Keep track of team members, their roles, and availability
                        </Text>
                    </LinearGradient>

                    <LinearGradient
                        colors={['#F3E8FF', '#E9D5FF']}
                        style={styles.featureCard}
                    >
                        <Text style={styles.featureIcon}>🔔</Text>
                        <Text style={styles.featureTitle}>Smart Notifications</Text>
                        <Text style={styles.featureDescription}>
                            Get notified about schedule changes and upcoming assignments
                        </Text>
                    </LinearGradient>
                </View>

                {/* Call to Action */}
                <LinearGradient
                    colors={['#8B5CF6', '#A855F7']}
                    style={styles.ctaSection}
                >
                    <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
                    <Text style={styles.ctaSubtitle}>
                        Join your pastoral team in organizing God's work
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => {
                            // Navigate to login screen
                            navigation.navigate('Login');
                        }}
                    >
                        <Text style={styles.primaryButtonText}>Get Started</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <Text style={styles.footerText}>
                    "For where two or three gather in my name, there am I with them." - Matthew 18:20
                </Text>
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
    scrollView: {
        flex: 1,
        ...(Platform.OS === 'web' && {
            height: '100vh',
            overflow: 'auto',
        }),
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 30,
        paddingBottom: 20,
        ...(Platform.OS === 'web' && {
            minHeight: '100%',
        }),
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#581C87',
        textAlign: 'center',
        marginBottom: 15,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#7C3AED',
        textAlign: 'center',
        lineHeight: 24,
    },
    featuresContainer: {
        marginBottom: 40,
    },
    featureCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
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
    featureIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    featureTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#581C87',
        marginBottom: 5,
    },
    featureDescription: {
        fontSize: 14,
        color: '#7C3AED',
        textAlign: 'center',
    },
    ctaSection: {
        padding: 30,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    ctaTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 10,
        textAlign: 'center',
    },
    ctaSubtitle: {
        fontSize: 16,
        color: '#E9D5FF',
        textAlign: 'center',
        marginBottom: 20,
    },
    primaryButton: {
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 12,
        width: '80%',
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footerText: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 20,
    },
});

export default LandingScreen;