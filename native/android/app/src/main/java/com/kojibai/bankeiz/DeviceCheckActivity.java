package com.kojibai.bankeiz;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class DeviceCheckActivity extends Activity {
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // The test has its own synthetic evidence and never receives a Bankeiz wallet session.
            startActivity(new Intent().setClassName(
                    this, "com.kojibai.bankeiz.custodyprobe.ProbeActivity"));
            finish();
            return;
        }

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        content.setPadding(padding, padding, padding, padding);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            content.setOnApplyWindowInsetsListener((view, insets) -> {
                var safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(padding + safe.left, padding + safe.top,
                        padding + safe.right, padding + safe.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        TextView message = new TextView(this);
        message.setText(R.string.bankeiz_device_check_unavailable);
        content.addView(message);

        Button open = new Button(this);
        open.setText(R.string.bankeiz_open_wallet);
        open.setOnClickListener(button -> {
            startActivity(new Intent(this, BankeizLauncherActivity.class));
            finish();
        });
        content.addView(open);
        setContentView(content);
    }
}
