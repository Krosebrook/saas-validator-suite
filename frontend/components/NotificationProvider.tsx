import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useToast } from '@/components/ui/use-toast';

interface NotificationMessage {
  type: "analysis_started" | "analysis_completed" | "analysis_failed" | "credits_updated" | "system_notification";
  data: {
    ideaId?: number;
    title?: string;
    overallScore?: number;
    creditsRemaining?: number;
    message?: string;
    timestamp: string;
  };
  userId: string;
}

interface NotificationContextType {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnect: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

  const connect = async () => {
    if (!isSignedIn) return;

    try {
      setConnectionStatus('connecting');
      
      const token = await getToken();
      if (!token) {
        setConnectionStatus('error');
        return;
      }

      // Create WebSocket connection to notifications endpoint
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/notifications/connect`;
      
      const ws = new WebSocket(wsUrl);
      
      // Set auth header (this might need to be handled differently based on your WebSocket implementation)
      ws.onopen = () => {
        setConnectionStatus('connected');
        console.log('Connected to notifications');
        
        // Send authentication
        ws.send(JSON.stringify({
          type: 'auth',
          token: `Bearer ${token}`
        }));

        // Start heartbeat
        heartbeatIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'system_notification',
              data: {
                message: 'ping',
                timestamp: new Date().toISOString()
              },
              userId: ''
            }));
          }
        }, 30000); // Send ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const notification: NotificationMessage = JSON.parse(event.data);
          handleNotification(notification);
        } catch (error) {
          console.error('Failed to parse notification message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        console.log('Disconnected from notifications');
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          window.clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to notifications:', error);
      setConnectionStatus('error');
      
      // Retry connection after 10 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 10000);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const handleNotification = (notification: NotificationMessage) => {
    switch (notification.type) {
      case 'analysis_started':
        toast({
          title: 'Analysis Started',
          description: `AI analysis started for "${notification.data.title}"`,
        });
        break;
        
      case 'analysis_completed':
        toast({
          title: 'Analysis Complete',
          description: `"${notification.data.title}" scored ${notification.data.overallScore}/100`,
          variant: 'default',
        });
        break;
        
      case 'analysis_failed':
        toast({
          title: 'Analysis Failed',
          description: `Analysis failed for "${notification.data.title}": ${notification.data.message}`,
          variant: 'destructive',
        });
        break;
        
      case 'credits_updated':
        toast({
          title: 'Credits Updated',
          description: `You have ${notification.data.creditsRemaining} credits remaining`,
        });
        break;
        
      case 'system_notification':
        if (notification.data.message !== 'pong') {
          toast({
            title: 'System Notification',
            description: notification.data.message,
          });
        }
        break;
        
      default:
        console.log('Unknown notification type:', notification.type);
    }
  };

  const reconnect = () => {
    disconnect();
    connect();
  };

  useEffect(() => {
    if (isSignedIn) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isSignedIn]);

  const value: NotificationContextType = {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    reconnect,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}