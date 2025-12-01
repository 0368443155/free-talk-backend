'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminTabsTest() {
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Admin Tabs Test</h1>

            <Tabs defaultValue="tab1" className="w-full">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                    <TabsTrigger value="tab3">Tab 3</TabsTrigger>
                </TabsList>

                <TabsContent value="tab1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tab 1 Content</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>This is the content for Tab 1</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tab2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tab 2 Content</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>This is the content for Tab 2</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tab3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tab 3 Content</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>This is the content for Tab 3</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
