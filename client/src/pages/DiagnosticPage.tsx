import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useState, useEffect } from "react";

export default function DiagnosticPage() {
  const [appInfo, setAppInfo] = useState<any>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('checking...');

  useEffect(() => {
    const loadInfo = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await CapacitorApp.getInfo();
          setAppInfo(info);
        } catch (error) {
          console.error('Failed to get app info:', error);
        }
      }

      // Check microphone permission
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissionStatus(result.state);
        } catch (error) {
          setPermissionStatus('not supported');
        }
      } else {
        setPermissionStatus('Permissions API not available');
      }
    };

    loadInfo();
  }, []);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Diagnostics</h1>
        <p className="text-muted-foreground">Debug information for native app</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capacitor Platform Detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Platform:</span>
            <Badge>{Capacitor.getPlatform()}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Is Native Platform:</span>
            <Badge variant={Capacitor.isNativePlatform() ? "default" : "destructive"}>
              {Capacitor.isNativePlatform() ? 'YES' : 'NO'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Is Plugin Available:</span>
            <Badge>{Capacitor.isPluginAvailable('App') ? 'YES' : 'NO'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {appInfo ? (
            <>
              <div className="flex justify-between">
                <span className="font-medium">App Name:</span>
                <span className="font-mono">{appInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">App ID:</span>
                <span className="font-mono text-xs">{appInfo.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Version:</span>
                <span className="font-mono">{appInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Build:</span>
                <span className="font-mono">{appInfo.build}</span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Not running on native platform</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">User Agent:</span>
            <span className="font-mono text-xs truncate max-w-xs">{navigator.userAgent}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Window Location:</span>
            <span className="font-mono text-xs truncate max-w-xs">{window.location.href}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Origin:</span>
            <span className="font-mono text-xs">{window.location.origin}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Microphone Permission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">MediaDevices Available:</span>
            <Badge>{navigator.mediaDevices ? 'YES' : 'NO'}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">getUserMedia Available:</span>
            <Badge>{navigator.mediaDevices?.getUserMedia ? 'YES' : 'NO'}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Permission Status:</span>
            <Badge>{permissionStatus}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
