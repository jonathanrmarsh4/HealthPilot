
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
      {
          "id": "onesignal-cordova-plugin.OneSignalPlugin",
          "file": "plugins/onesignal-cordova-plugin/dist/index.js",
          "pluginId": "onesignal-cordova-plugin",
        "clobbers": [
          "OneSignal"
        ]
        },
      {
          "id": "onesignal-cordova-plugin.NotificationReceivedEvent",
          "file": "plugins/onesignal-cordova-plugin/dist/NotificationReceivedEvent.js",
          "pluginId": "onesignal-cordova-plugin"
        },
      {
          "id": "onesignal-cordova-plugin.OSNotification",
          "file": "plugins/onesignal-cordova-plugin/dist/OSNotification.js",
          "pluginId": "onesignal-cordova-plugin"
        },
      {
          "id": "onesignal-cordova-plugin.UserNamespace",
          "file": "plugins/onesignal-cordova-plugin/dist/UserNamespace.js",
          "pluginId": "onesignal-cordova-plugin"
        },
      {
          "id": "onesignal-cordova-plugin.PushSubscriptionNamespace",
          "file": "plugins/onesignal-cordova-plugin/dist/PushSubscriptionNamespace.js",
          "pluginId": "onesignal-cordova-plugin"
        },
      {
          "id": "onesignal-cordova-plugin.DebugNamespace",
          "file": "plugins/onesignal-cordova-plugin/dist/DebugNamespace.js",
          "pluginId": "onesignal-cordova-plugin"
        },
      {
          "id": "onesignal-cordova-plugin.InAppMessagesNamespace",
          "file": "plugins/onesignal-cordova-plugin/dist/InAppMessagesNamespace.js",
          "pluginId": "onesignal-cordova-plugin"
        },
      {
          "id": "onesignal-cordova-plugin.SessionNamespace",
          "file": "plugins/onesignal-cordova-plugin/dist/SessionNamespace.js",
          "pluginId": "onesignal-cordova-plugin"
        },
      {
          "id": "onesignal-cordova-plugin.LocationNamespace",
          "file": "plugins/onesignal-cordova-plugin/dist/LocationNamespace.js",
          "pluginId": "onesignal-cordova-plugin"
        },
      {
          "id": "onesignal-cordova-plugin.NotificationsNamespace",
          "file": "plugins/onesignal-cordova-plugin/dist/NotificationsNamespace.js",
          "pluginId": "onesignal-cordova-plugin"
        },
      {
          "id": "onesignal-cordova-plugin.LiveActivitiesNamespace",
          "file": "plugins/onesignal-cordova-plugin/dist/LiveActivitiesNamespace.js",
          "pluginId": "onesignal-cordova-plugin"
        }
    ];
    module.exports.metadata =
    // TOP OF METADATA
    {
      "onesignal-cordova-plugin": "5.2.15"
    };
    // BOTTOM OF METADATA
    });
    